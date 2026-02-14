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
    age: Math.min(unitA.age, unitB.age),
    trait: unitA.trait, // 統合時はunitAの特性を継承
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
  const newUnit: Unit = {
    id: `unit-${Date.now()}-${Math.random()}`,
    factionId: male.factionId,
    x: birthCell.x,
    y: birthCell.y,
    sex: getRandomSex(),
    value: childValue,
    isHero: false,
    age: 0,
    trait: getRandomTrait(),
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
 * 差分の数字を減らす（いきなり死なない）
 */
function handleEnemyCollision(
  unitA: Unit,
  unitB: Unit,
  gameState: GameState,
): { units: Unit[]; cells: Cell[][] } {
  const valueDiff = Math.abs(unitA.value - unitB.value);
  
  // 値が大きい方が勝者
  const winner = unitA.value > unitB.value ? unitA : unitB;
  const loser = winner.id === unitA.id ? unitB : unitA;

  // 敗者のvalueを差分だけ減らす
  const newLoserValue = loser.value - valueDiff;

  const newCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));

  const newUnits = gameState.units.map((u) => {
    if (u.id === winner.id) {
      // 勝者はvalueを増やす（敗者のvalueの一部を獲得）
      const valueGain = Math.min(loser.value, 3); // 最大3まで獲得
      return { ...u, value: u.value + valueGain, x: winner.x, y: winner.y };
    }
    if (u.id === loser.id) {
      // 敗者は差分だけvalueを減らす
      if (newLoserValue <= 0) {
        // valueが0以下になった場合は削除
        // cellからも削除
        if (newCells[loser.y]?.[loser.x]) {
          newCells[loser.y]![loser.x]!.unitId = null;
        }
        return null;
      }
      return { ...u, value: newLoserValue, x: loser.x, y: loser.y };
    }
    return u;
  }).filter((u): u is Unit => u !== null);

  return { units: newUnits, cells: newCells };
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

  // 衝突を解決（敵勢力衝突を優先）
  const processedUnits = new Set<string>();

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
      units = handleEnemyCollision(unitA, unitB, { ...gameState, units });
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

