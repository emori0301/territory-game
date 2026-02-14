// 衝突解決ロジック

import { getAdjacentEmptyCells, getRandomSex, getRandomTrait } from "./utils";
import type { Cell, GameState, Unit } from "./types";

/**
 * 同勢力衝突: 雄 × 雄
 */
function handleMaleMaleCollision(
  unitA: Unit,
  unitB: Unit,
  gameState: GameState,
): Unit[] {
  const mergedValue = unitA.value + unitB.value;
  const mergedUnit: Unit = {
    id: unitA.id,
    factionId: unitA.factionId,
    x: unitA.x,
    y: unitA.y,
    sex: "male",
    value: mergedValue,
    isHero: unitA.isHero || unitB.isHero,
    trait: unitA.trait, // 統合時はunitAの特性を継承
    inCombat: false,
  };

  // unitBを削除し、unitAを統合
  const newUnits = gameState.units.filter((u) => u.id !== unitB.id);
  const index = newUnits.findIndex((u) => u.id === unitA.id);
  if (index !== -1) {
    newUnits[index] = mergedUnit;
  }

  return newUnits;
}

/**
 * 同勢力衝突: 雄 × 雌（繁殖）
 */
function handleMaleFemaleCollision(
  unitA: Unit,
  unitB: Unit,
  gameState: GameState,
): { units: Unit[]; newUnit: Unit | null } {
  // どちらが雄か雌かを判定
  const male = unitA.sex === "male" ? unitA : unitB;
  const female = unitA.sex === "female" ? unitA : unitB;

  // 隣接する空きマスを探す
  const emptyCells = getAdjacentEmptyCells(male.x, male.y, gameState.cells);
  if (emptyCells.length === 0) {
    // 空きマスがない場合は不発
    return { units: gameState.units, newUnit: null };
  }

  // ランダムに空きマスを選択
  const birthCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]!;

  // 子供を生成
  const childValue = Math.floor((male.value + female.value) / 2);
  const childSex = getRandomSex();
  const newUnit: Unit = {
    id: `unit-${Date.now()}-${Math.random()}`,
    factionId: male.factionId,
    x: birthCell.x,
    y: birthCell.y,
    sex: childSex,
    value: childValue,
    isHero: false,
    trait: getRandomTrait(childSex),
    inCombat: false,
  };

  // 親のvalueを-2
  const newUnits = gameState.units.map((u) => {
    if (u.id === male.id) {
      return { ...u, value: u.value - 2 };
    }
    if (u.id === female.id) {
      return { ...u, value: u.value - 2 };
    }
    return u;
  });

  // 子供を追加
  newUnits.push(newUnit);

  return { units: newUnits, newUnit };
}

/**
 * 同勢力衝突: 雌 × 雌
 */
function handleFemaleFemaleCollision(
  unitA: Unit,
  unitB: Unit,
  gameState: GameState,
): Unit[] {
  const total = unitA.value + unitB.value;
  const newUnits = gameState.units.map((u) => {
    if (u.id === unitA.id) {
      return { ...u, value: Math.floor(total / 2) };
    }
    if (u.id === unitB.id) {
      return { ...u, value: Math.ceil(total / 2) };
    }
    return u;
  });
  return newUnits;
}

/**
 * 敵勢力衝突（戦闘）
 * 毎tick戦闘して、どちらかが死ぬまで続ける
 */
function handleEnemyCollision(
  unitA: Unit,
  unitB: Unit,
  gameState: GameState,
): { units: Unit[]; cells: Cell[][] } {
  // 戦闘ダメージ（valueの10%または最小1）
  const damageA = Math.max(1, Math.floor(unitB.value * 0.1));
  const damageB = Math.max(1, Math.floor(unitA.value * 0.1));
  
  const newCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));
  const combatPosition = { x: unitA.x, y: unitA.y };

  const newUnits = gameState.units.map((u) => {
    if (u.id === unitA.id) {
      const newValue = unitA.value - damageA;
      if (newValue <= 0) {
        // unitAが死亡
        if (newCells[combatPosition.y]?.[combatPosition.x]) {
          newCells[combatPosition.y]![combatPosition.x]!.unitId = null;
        }
        return null;
      }
      // unitAは戦闘継続（移動できない）
      const updatedUnit = { 
        ...u, 
        value: newValue, 
        x: combatPosition.x, 
        y: combatPosition.y,
        inCombat: true,
      };
      if (newCells[updatedUnit.y]?.[updatedUnit.x]) {
        newCells[updatedUnit.y]![updatedUnit.x]!.unitId = updatedUnit.id;
      }
      return updatedUnit;
    }
    if (u.id === unitB.id) {
      const newValue = unitB.value - damageB;
      if (newValue <= 0) {
        // unitBが死亡
        if (newCells[combatPosition.y]?.[combatPosition.x]) {
          newCells[combatPosition.y]![combatPosition.x]!.unitId = null;
        }
        return null;
      }
      // unitBは戦闘継続（移動できない）
      const updatedUnit = { 
        ...u, 
        value: newValue, 
        x: combatPosition.x, 
        y: combatPosition.y,
        inCombat: true,
      };
      if (newCells[updatedUnit.y]?.[updatedUnit.x]) {
        newCells[updatedUnit.y]![updatedUnit.x]!.unitId = updatedUnit.id;
      }
      return updatedUnit;
    }
    // 他のコマは戦闘フラグをクリア（移動可能）
    return { ...u, inCombat: false };
  }).filter((u): u is Unit => u !== null);

  return { units: newUnits, cells: newCells };
}

/**
 * 同じ位置にいる敵同士を検出（継続戦闘用）
 */
function detectOngoingCombat(gameState: GameState): Map<string, string[]> {
  const combatMap = new Map<string, string[]>();
  
  // 各マスで敵同士がいるかチェック
  for (let y = 0; y < gameState.cells.length; y++) {
    for (let x = 0; x < gameState.cells[y]!.length; x++) {
      const cell = gameState.cells[y]![x];
      if (!cell || !cell.unitId) continue;
      
      // このマスにいる全てのコマを検索
      const unitsAtPosition = gameState.units.filter((u) => u.x === x && u.y === y);
      
      if (unitsAtPosition.length >= 2) {
        // 敵同士がいるかチェック
        for (let i = 0; i < unitsAtPosition.length; i++) {
          for (let j = i + 1; j < unitsAtPosition.length; j++) {
            const unitA = unitsAtPosition[i]!;
            const unitB = unitsAtPosition[j]!;
            
            if (unitA.factionId !== unitB.factionId) {
              const key = `${x},${y}`;
              if (!combatMap.has(key)) {
                combatMap.set(key, []);
              }
              const unitIds = combatMap.get(key)!;
              if (!unitIds.includes(unitA.id)) unitIds.push(unitA.id);
              if (!unitIds.includes(unitB.id)) unitIds.push(unitB.id);
            }
          }
        }
      }
    }
  }
  
  return combatMap;
}

/**
 * 衝突を解決
 */
export function resolveCollisions(
  collisions: Map<string, string[]>,
  gameState: GameState,
): { units: Unit[]; cells: Cell[][] } {
  let units = [...gameState.units];
  const cells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));

  // 継続戦闘を検出（同じ位置にいる敵同士）
  const ongoingCombat = detectOngoingCombat({ ...gameState, units, cells });
  
  // 継続戦闘を処理
  const processedUnits = new Set<string>();
  
  for (const [key, unitIds] of ongoingCombat.entries()) {
    if (unitIds.length < 2) continue;
    
    // 最初の2体のみ処理（複数敵がいる場合は最初の2体が戦闘）
    const [idA, idB] = unitIds.slice(0, 2);
    if (processedUnits.has(idA) || processedUnits.has(idB)) continue;
    
    const unitA = units.find((u) => u.id === idA);
    const unitB = units.find((u) => u.id === idB);
    if (!unitA || !unitB) continue;
    
    // 敵勢力衝突を処理
    if (unitA.factionId !== unitB.factionId) {
      const result = handleEnemyCollision(unitA, unitB, { ...gameState, units, cells });
      units = result.units;
      // cellsを更新
      for (let y = 0; y < cells.length; y++) {
        for (let x = 0; x < cells[y]!.length; x++) {
          cells[y]![x] = result.cells[y]![x]!;
        }
      }
      processedUnits.add(idA);
      processedUnits.add(idB);
    }
  }

  // 新しい衝突を解決（敵勢力衝突を優先）
  for (const [key, unitIds] of collisions.entries()) {
    if (unitIds.length !== 2) continue; // 2体の衝突のみ処理

    const [idA, idB] = unitIds;
    if (processedUnits.has(idA) || processedUnits.has(idB)) continue;

    const unitA = units.find((u) => u.id === idA);
    const unitB = units.find((u) => u.id === idB);
    if (!unitA || !unitB) continue;

    const [x, y] = key.split(",").map(Number);

    // 敵勢力衝突を優先
    if (unitA.factionId !== unitB.factionId) {
      const result = handleEnemyCollision(unitA, unitB, { ...gameState, units, cells });
      units = result.units;
      // cellsを更新
      for (let y = 0; y < cells.length; y++) {
        for (let x = 0; x < cells[y]!.length; x++) {
          cells[y]![x] = result.cells[y]![x]!;
        }
      }
      processedUnits.add(idA);
      processedUnits.add(idB);
      continue;
    }

    // 同勢力衝突
    if (unitA.sex === "male" && unitB.sex === "male") {
      units = handleMaleMaleCollision(unitA, unitB, { ...gameState, units });
      processedUnits.add(idA);
      processedUnits.add(idB);
    } else if (
      (unitA.sex === "male" && unitB.sex === "female") ||
      (unitA.sex === "female" && unitB.sex === "male")
    ) {
      const result = handleMaleFemaleCollision(unitA, unitB, {
        ...gameState,
        units,
      });
      units = result.units;
      if (result.newUnit) {
        cells[result.newUnit.y]![result.newUnit.x]!.unitId = result.newUnit.id;
      }
      processedUnits.add(idA);
      processedUnits.add(idB);
    } else if (unitA.sex === "female" && unitB.sex === "female") {
      units = handleFemaleFemaleCollision(unitA, unitB, {
        ...gameState,
        units,
      });
      processedUnits.add(idA);
      processedUnits.add(idB);
    }
  }

  return { units, cells };
}

