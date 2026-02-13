// Tick処理（ゲームの1ターン）

import {
  DECAY_THRESHOLD,
  HERO_BIRTH_PROBABILITY,
  HERO_BIRTH_THRESHOLD,
  HERO_MAX_AGE,
  MAX_AGE,
  MAX_TICKS,
} from "./constants";
import {
  detectCollisions,
  generateMoveIntents,
  resolveMoveIntents,
} from "./movement";
import { resolveCollisions } from "./collision";
import { getSurroundingCells } from "./utils";
import type { Cell, GameState, Unit } from "./types";

/**
 * 領地を塗る処理
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

  // 英雄の場合、周囲も塗る
  if (unit.isHero) {
    const surrounding = getSurroundingCells(x, y);
    for (const pos of surrounding) {
      if (cells[pos.y]?.[pos.x]) {
        cells[pos.y]![pos.x]!.ownerFactionId = unit.factionId;
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
          units[unitIndex] = { ...targetUnit, isHero: true };
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

    // age >= 100（英雄は50）
    const maxAge = unit.isHero ? HERO_MAX_AGE : MAX_AGE;
    if (unit.age >= maxAge) {
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
 * 勝利条件をチェック
 */
export function checkWinCondition(gameState: GameState): {
  status: "playing" | "finished";
  winnerId: string | null;
} {
  const factionUnitCounts = new Map<string, number>();

  for (const unit of gameState.units) {
    const count = factionUnitCounts.get(unit.factionId) || 0;
    factionUnitCounts.set(unit.factionId, count + 1);
  }

  // 片勢力のコマ数が0
  for (const [factionId, count] of factionUnitCounts.entries()) {
    if (count === 0) {
      // もう一方の勢力が勝者
      for (const [otherFactionId] of factionUnitCounts.entries()) {
        if (otherFactionId !== factionId) {
          return { status: "finished", winnerId: otherFactionId };
        }
      }
    }
  }

  // 500tick経過
  if (gameState.tick >= MAX_TICKS) {
    // コマ数が多い勢力が勝者
    let maxCount = 0;
    let winnerId: string | null = null;

    for (const [factionId, count] of factionUnitCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        winnerId = factionId;
      } else if (count === maxCount) {
        winnerId = null; // 同数の場合は引き分け
      }
    }

    return { status: "finished", winnerId };
  }

  return { status: "playing", winnerId: null };
}

/**
 * 1tickを実行
 */
export function executeTick(gameState: GameState): GameState {
  if (gameState.status === "finished") {
    return gameState;
  }

  // 1. 移動意図を生成
  const moveIntents = generateMoveIntents(gameState);

  // 2. 移動意図を解決
  const moveResults = resolveMoveIntents(gameState, moveIntents);

  // 3. 衝突を検出
  const collisions = detectCollisions(moveResults);

  // 4. 衝突を解決
  let { units, cells } = resolveCollisions(collisions, gameState);

  // 5. 移動を確定（衝突解決後）
  const unitMap = new Map<string, Unit>();
  for (const unit of units) {
    unitMap.set(unit.id, unit);
  }

  const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  for (const [unitId, pos] of moveResults.entries()) {
    const unit = unitMap.get(unitId);
    if (!unit) continue;

    const oldCell = newCells[unit.y]![unit.x]!;
    const newCell = newCells[pos.y]![pos.x]!;

    // 移動先が空いている場合のみ移動
    if (newCell.unitId === null || newCell.unitId === unitId) {
      // 古いマスからコマを削除
      oldCell.unitId = null;

      // 新しいマスにコマを配置
      newCell.unitId = unitId;
      unit.x = pos.x;
      unit.y = pos.y;

      // 領地を塗る
      const { cells: paintedCells, valueConsumed } = paintTerritory(
        unit,
        pos.x,
        pos.y,
        newCells,
        { ...gameState, units, cells: newCells },
      );
      newCells[pos.y]![pos.x] = paintedCells[pos.y]![pos.x]!;

      if (valueConsumed) {
        unit.value -= 1;
      }
    }
  }

  // 6. ageを増加
  units = units.map((u) => ({ ...u, age: u.age + 1 }));

  // 7. 自然減衰
  units = applyNaturalDecay(units);

  // 8. 英雄誕生判定
  units = checkHeroBirth({ ...gameState, units, cells: newCells });

  // 9. 死亡処理
  const { units: survivedUnits, cells: finalCells } = processDeaths(
    units,
    newCells,
  );

  // 10. 勝利条件をチェック
  const newTick = gameState.tick + 1;
  const { status, winnerId } = checkWinCondition({
    ...gameState,
    tick: newTick,
    units: survivedUnits,
    cells: finalCells,
  });

  return {
    ...gameState,
    tick: newTick,
    status,
    winnerId,
    units: survivedUnits,
    cells: finalCells,
  };
}

