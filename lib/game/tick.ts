// Tick処理（ゲームの1ターン）

import {
  DECAY_THRESHOLD,
  HERO_BIRTH_PROBABILITY,
  HERO_BIRTH_THRESHOLD,
} from "./constants";
import {
  detectCollisions,
  generateMoveIntents,
  resolveMoveIntents,
} from "./movement";
import { resolveCollisions } from "./collision";
import { canPassTerrain, getSurroundingCells, getSurrounding8Cells, getTerrainValueCost, isValidPosition, getRandomSex, getRandomTrait } from "./utils";
import { checkWinCondition } from "./winCondition";
import type { Cell, GameState, Unit, TerrainType, UnitTrait, UserCommand } from "./types";

/**
 * 領地を塗る処理
 * 地形マス（水、岩、山）は塗れない
 */
function paintTerritory(
  unit: Unit,
  x: number,
  y: number,
  cells: Cell[][],
  gameState: GameState,
): { cells: Cell[][]; valueConsumed: boolean } {
  const cell = cells[y]![x]!;
  let valueConsumed = false;

  // 通れない地形は塗れない（山のみ）
  const unpaintableTerrains: TerrainType[] = ["mountain"];
  if (unpaintableTerrains.includes(cell.terrain)) {
    return { cells, valueConsumed: false };
  }

  // 英雄の場合、周囲も塗る（地形マスは除く）
  if (unit.isHero) {
    const surrounding = getSurroundingCells(x, y);
    for (const pos of surrounding) {
      const surroundingCell = cells[pos.y]?.[pos.x];
      if (surroundingCell && !unpaintableTerrains.includes(surroundingCell.terrain)) {
        surroundingCell.ownerFactionId = unit.factionId;
      }
    }
  }

  // 移動先が自勢力領地でない場合、valueを消費して塗る
  if (cell.ownerFactionId !== unit.factionId) {
    valueConsumed = true;
    cell.ownerFactionId = unit.factionId;
  }

  return { cells, valueConsumed };
}

/**
 * 自然減衰処理
 */
function applyNaturalDecay(units: Unit[]): Unit[] {
  return units.map((unit) => {
    if (unit.isHero) {
      return unit; // 英雄は減衰なし
    }
    if (unit.value > DECAY_THRESHOLD) {
      return { ...unit, value: unit.value - 1 };
    }
    return unit;
  });
}

/**
 * 英雄誕生判定
 */
function checkHeroBirth(gameState: GameState): Unit[] {
  const units = [...gameState.units];
  const factionUnitCounts = new Map<string, number>();

  // 各勢力のコマ数をカウント
  for (const unit of units) {
    const count = factionUnitCounts.get(unit.factionId) || 0;
    factionUnitCounts.set(unit.factionId, count + 1);
  }

  const totalUnits = units.length;

  // 各勢力をチェック
  for (const [factionId, count] of factionUnitCounts.entries()) {
    const ratio = count / totalUnits;

    // 20%未満で、既に英雄がいない場合
    if (ratio < HERO_BIRTH_THRESHOLD) {
      const factionUnits = units.filter((u) => u.factionId === factionId);
      const hasHero = factionUnits.some((u) => u.isHero);

      if (!hasHero && Math.random() < HERO_BIRTH_PROBABILITY) {
        // ランダムに1体を英雄化
        const targetIndex = Math.floor(Math.random() * factionUnits.length);
        const targetUnit = factionUnits[targetIndex]!;
        const unitIndex = units.findIndex((u) => u.id === targetUnit.id);
        if (unitIndex !== -1) {
          units[unitIndex] = { ...targetUnit, isHero: true, trait: targetUnit.trait, inCombat: false };
        }
      }
    }
  }

  return units;
}

/**
 * 死亡処理
 */
function processDeaths(units: Unit[], cells: Cell[][]): {
  units: Unit[];
  cells: Cell[][];
} {
  const newUnits: Unit[] = [];
  const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  for (const unit of units) {
    let shouldDie = false;

    // value <= 0
    if (unit.value <= 0) {
      shouldDie = true;
    }

    if (shouldDie) {
      // コマを削除
      if (newCells[unit.y]?.[unit.x]) {
        newCells[unit.y]![unit.x]!.unitId = null;
      }

      // 英雄の場合、周囲を無色化
      if (unit.isHero) {
        const surrounding = getSurroundingCells(unit.x, unit.y);
        for (const pos of surrounding) {
          if (newCells[pos.y]?.[pos.x]) {
            newCells[pos.y]![pos.x]!.ownerFactionId = null;
          }
        }
      }
    } else {
      newUnits.push(unit);
    }
  }

  return { units: newUnits, cells: newCells };
}


/**
 * 隣接する敵コマとの戦闘を検出
 * 隣り合ったらその場所で止まって戦闘中になる
 */
function detectAdjacentEnemyCombat(gameState: GameState): Map<string, string[]> {
  const combatCollisions = new Map<string, string[]>();
  const processedPairs = new Set<string>();

  // 各コマについて、隣接する敵をチェック
  for (const unit of gameState.units) {
    if (unit.inCombat) continue; // 既に戦闘中はスキップ

    // 隣接するマスをチェック（上下左右）
    const adjacentPositions = [
      { x: unit.x, y: unit.y - 1 }, // 上
      { x: unit.x, y: unit.y + 1 }, // 下
      { x: unit.x - 1, y: unit.y }, // 左
      { x: unit.x + 1, y: unit.y }, // 右
    ];

    for (const pos of adjacentPositions) {
      if (!isValidPosition(pos.x, pos.y, gameState.boardSize)) continue;

      // この位置にいる敵コマを検索
      const enemyUnit = gameState.units.find(
        (u) => u.id !== unit.id && 
               u.factionId !== unit.factionId && 
               u.x === pos.x && 
               u.y === pos.y &&
               !u.inCombat
      );

      if (enemyUnit) {
        // ペアのIDをソートして一意にする
        const pairKey = [unit.id, enemyUnit.id].sort().join("-");
        if (processedPairs.has(pairKey)) continue;

        // 戦闘位置はunitの位置を使用（その場所で止まる）
        const combatKey = `${unit.x},${unit.y}`;
        if (!combatCollisions.has(combatKey)) {
          combatCollisions.set(combatKey, []);
        }
        const unitIds = combatCollisions.get(combatKey)!;
        if (!unitIds.includes(unit.id)) unitIds.push(unit.id);
        if (!unitIds.includes(enemyUnit.id)) unitIds.push(enemyUnit.id);
        processedPairs.add(pairKey);
      }
    }
  }

  return combatCollisions;
}

/**
 * 拠点からのコマ生成（20tickごとにvalue15のコマを生成）
 */
function spawnUnitsFromBases(gameState: GameState): { units: Unit[]; cells: Cell[][] } {
  const newUnits: Unit[] = [...gameState.units];
  const newCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));

  for (let y = 0; y < gameState.boardSize; y++) {
    for (let x = 0; x < gameState.boardSize; x++) {
      const cell = newCells[y]?.[x];
      if (!cell || !cell.baseId || !cell.baseFactionId) continue;

      // 拠点が存在し、作成から30〜50tick毎にランダムでコマを生成（各拠点が独立してタイミングを持つ）
      const ticksSinceCreation = gameState.tick - (cell.baseCreatedTick || 0);
      // baseIdを使ってハッシュ化して、各拠点ごとに30〜50の間の固定間隔を決定
      let spawnInterval = 40; // デフォルト
      if (cell.baseId) {
        // baseIdの文字列をハッシュ化して30〜50の間の値を決定
        let hash = 0;
        for (let i = 0; i < cell.baseId.length; i++) {
          hash = ((hash << 5) - hash) + cell.baseId.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        spawnInterval = 30 + (Math.abs(hash) % 21); // 30〜50の間
      }
      
      // 最初の生成は作成からspawnInterval後、その後はspawnIntervalごと
      if (ticksSinceCreation > 0 && ticksSinceCreation % spawnInterval === 0) {
        // 拠点の周囲に空きマスがあるかチェック
        const adjacentPositions = [
          { x: x, y: y - 1 }, // 上
          { x: x, y: y + 1 }, // 下
          { x: x - 1, y: y }, // 左
          { x: x + 1, y: y }, // 右
        ];

        for (const pos of adjacentPositions) {
          if (!isValidPosition(pos.x, pos.y, gameState.boardSize)) continue;
          const adjacentCell = newCells[pos.y]?.[pos.x];
          if (!adjacentCell) continue;

          // 空きマスで、地形を通れる場合
          if (adjacentCell.unitId === null && 
              adjacentCell.terrain !== "water" && 
              adjacentCell.terrain !== "mountain") {
            const sex = getRandomSex();
            const newUnit: Unit = {
              id: `unit-${Date.now()}-${Math.random()}`,
              factionId: cell.baseFactionId,
              x: pos.x,
              y: pos.y,
              sex,
              value: 15,
              isHero: false,
              trait: getRandomTrait(sex),
              inCombat: false,
            };
            newUnits.push(newUnit);
            adjacentCell.unitId = newUnit.id;
            break; // 1つの拠点から1tickに1体のみ生成
          }
        }
      }
    }
  }

  return { units: newUnits, cells: newCells };
}

/**
 * 1tickを実行
 */
export function executeTick(gameState: GameState): GameState {
  try {
    if (gameState.status === "finished") {
      return gameState;
    }

    if (!gameState.units || !gameState.cells || !gameState.factions) {
      throw new Error("Invalid game state structure");
    }

  // 0. 隣接する敵コマとの戦闘を強制（移動前に処理）
  let currentUnits = [...gameState.units];
  let currentCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));
  const adjacentCombatCollisions = detectAdjacentEnemyCombat({ ...gameState, units: currentUnits, cells: currentCells });
  if (adjacentCombatCollisions.size > 0) {
    const adjacentCombatResult = resolveCollisions(adjacentCombatCollisions, { ...gameState, units: currentUnits, cells: currentCells });
    currentUnits = adjacentCombatResult.units;
    currentCells = adjacentCombatResult.cells;
  }

  // 1. 移動意図を生成
  const moveIntents = generateMoveIntents({ ...gameState, units: currentUnits, cells: currentCells });

  // 2. 移動意図を解決
  const moveResults = resolveMoveIntents({ ...gameState, units: currentUnits, cells: currentCells }, moveIntents);

  // 3. 衝突を検出
  const collisions = detectCollisions(moveResults);

  // 4. 衝突を解決
  let { units, cells } = resolveCollisions(collisions, { ...gameState, units: currentUnits, cells: currentCells });

  // 5. 移動を確定（衝突解決後）
  const unitMap = new Map<string, Unit>();
  for (const unit of units) {
    unitMap.set(unit.id, unit);
  }

  const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  // まず、全てのコマの位置をクリア
  for (let y = 0; y < newCells.length; y++) {
    for (let x = 0; x < newCells[y]!.length; x++) {
      newCells[y]![x]!.unitId = null;
    }
  }

  // 移動処理
  for (const [unitId, pos] of moveResults.entries()) {
    const unit = unitMap.get(unitId);
    if (!unit) continue;

    const oldCell = newCells[unit.y]?.[unit.x];
    const newCell = newCells[pos.y]?.[pos.x];
    
    if (!oldCell || !newCell) continue;

    // 地形を通れるかチェック
    if (!canPassTerrain(newCell.terrain, unit.isHero)) {
      // 移動できない場合は元の位置に配置
      oldCell.unitId = unitId;
      continue;
    }

    // 地形によるvalue消費を計算
    const terrainCost = getTerrainValueCost(newCell.terrain);
    
    // 停滞を防ぐため、平地ならvalueが低くても移動できる
    // ただし、領地を塗る場合はvalueが必要
    const isPlain = newCell.terrain === "plain";
    if (!isPlain && unit.value <= terrainCost && terrainCost > 0) {
      // 移動できない場合は元の位置に配置
      oldCell.unitId = unitId;
      continue;
    }

    // 移動先が空いている場合のみ移動
    if (newCell.unitId === null) {
      // 新しいマスにコマを配置
      newCell.unitId = unitId;
      unit.x = pos.x;
      unit.y = pos.y;

      // 木を切った場合は地形を平地に変更
      if (newCell.terrain === "tree" && terrainCost > 0) {
        newCell.terrain = "plain";
      }

      // 相手の拠点がある場合は破壊
      if (newCell.baseId && newCell.baseFactionId && newCell.baseFactionId !== unit.factionId) {
        const destroyedFactionId = newCell.baseFactionId;
        newCell.baseId = null;
        newCell.baseFactionId = null;
        newCell.baseCreatedTick = null;
        console.log(`[拠点破壊] tick=${gameState.tick}, unit=${unit.id}, pos=(${pos.x},${pos.y}), destroyed base of faction=${destroyedFactionId}`);
      }

      // 領地を塗る
      const { cells: paintedCells, valueConsumed } = paintTerritory(
        unit,
        pos.x,
        pos.y,
        newCells,
        { ...gameState, units, cells: newCells },
      );
      newCells[pos.y]![pos.x] = paintedCells[pos.y]![pos.x]!;

      // valueを消費（領地を塗る場合 + 地形コスト）
      let totalCost = terrainCost;
      if (valueConsumed) {
        totalCost += 1;
      }
      unit.value -= totalCost;
    } else {
      // 移動先にコマがいる場合は元の位置に配置
      oldCell.unitId = unitId;
    }
  }

  // 移動しなかったコマの位置を更新
  for (const unit of units) {
    if (!moveResults.has(unit.id)) {
      const cell = newCells[unit.y]?.[unit.x];
      if (cell && cell.unitId === null) {
        cell.unitId = unit.id;
      }
    }
  }

  // 6. 味方同士の合体処理（同じマスにいる味方コマを合体）
  const unitsByPosition = new Map<string, Unit[]>();
  for (const unit of units) {
    const key = `${unit.x},${unit.y}`;
    if (!unitsByPosition.has(key)) {
      unitsByPosition.set(key, []);
    }
    unitsByPosition.get(key)!.push(unit);
  }

  const mergedUnits: Unit[] = [];
  const processedUnitIds = new Set<string>();

  for (const [key, unitsAtPos] of unitsByPosition.entries()) {
    if (unitsAtPos.length < 2) {
      // 1体だけの場合はそのまま追加
      if (!processedUnitIds.has(unitsAtPos[0]!.id)) {
        mergedUnits.push(unitsAtPos[0]!);
        processedUnitIds.add(unitsAtPos[0]!.id);
      }
      continue;
    }

    // 同じマスにいるコマを勢力ごとにグループ化
    const unitsByFaction = new Map<string, Unit[]>();
    for (const unit of unitsAtPos) {
      if (!unitsByFaction.has(unit.factionId)) {
        unitsByFaction.set(unit.factionId, []);
      }
      unitsByFaction.get(unit.factionId)!.push(unit);
    }

    // 各勢力内で合体処理
    for (const [factionId, factionUnits] of unitsByFaction.entries()) {
      // 既に処理済みのコマはスキップ
      const unprocessedUnits = factionUnits.filter(u => !processedUnitIds.has(u.id));
      if (unprocessedUnits.length === 0) continue;
      
      if (unprocessedUnits.length === 1) {
        mergedUnits.push(unprocessedUnits[0]!);
        processedUnitIds.add(unprocessedUnits[0]!.id);
        continue;
      }

      // 複数の味方がいる場合は合体
      let totalValue = 0;
      let hasHero = false;
      let mergedTrait: UnitTrait = "normal";
      
      for (const unit of unprocessedUnits) {
        totalValue += unit.value;
        if (unit.isHero) hasHero = true;
        mergedTrait = unit.trait; // 最初のコマの特性を継承
        processedUnitIds.add(unit.id);
      }

      // 合体したコマを作成
      const mergedUnit: Unit = {
        id: unprocessedUnits[0]!.id, // 最初のコマのIDを使用
        factionId: factionId,
        x: unprocessedUnits[0]!.x,
        y: unprocessedUnits[0]!.y,
        sex: "male", // 合体後は雄になる
        value: totalValue,
        isHero: hasHero,
        trait: mergedTrait,
        inCombat: false,
      };

      mergedUnits.push(mergedUnit);
      
      // cell.unitIdを更新
      const cell = newCells[mergedUnit.y]?.[mergedUnit.x];
      if (cell) {
        cell.unitId = mergedUnit.id;
      }
    }
  }

  // 合体処理後のunitsを更新
  units = mergedUnits;

  // 7. 拠点作成（builder特性のコマを優先、value10以上で拠点を作成可能、周囲8マスに拠点がないこと）
  // builder特性のコマを先に処理して、拠点作成を優先
  const builderUnits = units.filter(u => u.trait === "builder" && !u.inCombat);
  const otherUnits = units.filter(u => u.trait !== "builder" || u.inCombat);
  
  // builder特性のコマを優先して処理
  const unitsToProcess = [...builderUnits, ...otherUnits];
  for (const unit of unitsToProcess) {
    if (unit.inCombat) continue; // 戦闘中は拠点を作成できない
    
    const cell = newCells[unit.y]?.[unit.x];
    if (!cell) continue;

    // 拠点作成条件チェック
    // 条件1: value10以上（baseCostが10なので、10以上あれば作成可能）
    if (unit.value < 10) continue;
    
    // 条件2: 通れない地形（山、水）は除外（色が塗られていても作成可能）
    if (cell.terrain === "mountain" || cell.terrain === "water") continue;
    
    // 条件3: そのマスに拠点がない
    if (cell.baseId !== null) continue;
    
    // 条件4: そのマスにコマがいる（合体処理後も確実に更新されている）
    // 合体処理でcell.unitIdが更新されているはずだが、念のため直接確認
    const unitAtCell = units.find(u => u.x === unit.x && u.y === unit.y && u.id === unit.id);
    if (!unitAtCell) continue;
    
    // 条件5: 周囲8マスに拠点がないかチェック
    const surrounding8Cells = getSurrounding8Cells(unit.x, unit.y, gameState.boardSize);
    let hasNearbyBase = false;
    for (const pos of surrounding8Cells) {
      const nearbyCell = newCells[pos.y]?.[pos.x];
      if (nearbyCell && nearbyCell.baseId !== null) {
        hasNearbyBase = true;
        break;
      }
    }
    
    // 周囲8マスに拠点がない場合のみ拠点を作成
    if (!hasNearbyBase) {
      const baseCost = 10;
      // valueがbaseCost以上ある場合のみ拠点を作成
      if (unit.value >= baseCost) {
        const baseId = `base-${Date.now()}-${Math.random()}`;
        cell.baseId = baseId;
        cell.baseFactionId = unit.factionId;
        cell.baseCreatedTick = gameState.tick; // 作成された日を保持
        unit.value -= baseCost;
        // cell.unitIdも確実に更新
        cell.unitId = unit.id;
        
        // デバッグログ
        console.log(`[拠点作成] tick=${gameState.tick}, unit=${unit.id}, pos=(${unit.x},${unit.y}), baseId=${baseId}, faction=${unit.factionId}, value=${unit.value}`);
      }
    }
  }

  // 6. 自然減衰は削除（塗りをした時のみvalueを消費）

  // 7. 拠点からのコマ生成（20tickごとにvalue15のコマを生成）
  const baseSpawnResult = spawnUnitsFromBases({ ...gameState, units, cells: newCells });
  units = baseSpawnResult.units;
  newCells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (baseSpawnResult.cells[y]?.[x]) {
        newCells[y]![x] = baseSpawnResult.cells[y]![x]!;
      }
    });
  });

  // 8. 英雄誕生判定
  units = checkHeroBirth({ ...gameState, units, cells: newCells });

  // 9. 死亡処理
  const { units: survivedUnits, cells: finalCells } = processDeaths(
    units,
    newCells,
  );

    // 11. 勝利条件をチェック
    const newTick = gameState.tick + 1;
    const { status, winnerId } = checkWinCondition({
      ...gameState,
      tick: newTick,
      units: survivedUnits,
      cells: finalCells,
    });

    // ユーザー命令をクリア（1tickで処理されたので）
    const clearedUserCommands: UserCommand[] = [];
    
    return {
      ...gameState,
      tick: newTick,
      status,
      winnerId,
      units: survivedUnits,
      cells: finalCells,
      userCommands: clearedUserCommands, // 命令をクリア
    };
  } catch (error) {
    console.error("Error in executeTick:", error);
    console.error("GameState:", JSON.stringify(gameState, null, 2));
    // エラーが発生した場合は、ゲーム状態をそのまま返す（クラッシュを防ぐ）
    return gameState;
  }
}

