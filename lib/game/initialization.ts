// ゲーム初期化ロジック

import { BOARD_SIZE, INITIAL_UNITS_PER_FACTION, INITIAL_UNIT_VALUE } from "./constants";
import { getRandomSex, getRandomTrait, isValidPosition, randomInt } from "./utils";
import type { Cell, Faction, GameState, Unit } from "./types";

/**
 * 空の盤面を作成
 */
export function createEmptyBoard(): Cell[][] {
  const cells: Cell[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    cells[y] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      cells[y]![x] = {
        x,
        y,
        ownerFactionId: null,
        unitId: null,
      };
    }
  }
  return cells;
}

/**
 * 初期コマを配置
 * 4勢力を四隅に配置
 * 勢力A: 左上 (0-9, 0-9)
 * 勢力B: 右上 (20-29, 0-9)
 * 勢力C: 左下 (0-9, 20-29)
 * 勢力D: 右下 (20-29, 20-29)
 */
export function placeInitialUnits(
  cells: Cell[][],
  factionA: Faction,
  factionB: Faction,
  factionC: Faction,
  factionD: Faction,
): Unit[] {
  const units: Unit[] = [];
  let unitIdCounter = 0;

  // 勢力A（左上）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(0, 9);
      const y = randomInt(0, 9);
      if (cells[y]![x]!.unitId === null) {
        const sex = getRandomSex();
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionA.id,
          x,
          y,
          sex,
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          trait: getRandomTrait(sex),
          inCombat: false,
        };
        units.push(unit);
        cells[y]![x]!.unitId = unit.id;
        placed = true;
      }
    }
  }

  // 勢力B（右上）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(20, 29);
      const y = randomInt(0, 9);
      if (cells[y]![x]!.unitId === null) {
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionB.id,
          x,
          y,
          sex: getRandomSex(),
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          trait: getRandomTrait(),
        };
        units.push(unit);
        cells[y]![x]!.unitId = unit.id;
        placed = true;
      }
    }
  }

  // 勢力C（左下）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(0, 9);
      const y = randomInt(20, 29);
      if (cells[y]![x]!.unitId === null) {
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionC.id,
          x,
          y,
          sex: getRandomSex(),
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          trait: getRandomTrait(),
        };
        units.push(unit);
        cells[y]![x]!.unitId = unit.id;
        placed = true;
      }
    }
  }

  // 勢力D（右下）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(20, 29);
      const y = randomInt(20, 29);
      if (cells[y]![x]!.unitId === null) {
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionD.id,
          x,
          y,
          sex: getRandomSex(),
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          trait: getRandomTrait(),
        };
        units.push(unit);
        cells[y]![x]!.unitId = unit.id;
        placed = true;
      }
    }
  }

  return units;
}

/**
 * 新しいゲーム状態を作成
 */
export function createNewGame(): GameState {
  try {
    const factionA: Faction = {
      id: "faction-a",
      name: "勢力A（青）",
    };
    const factionB: Faction = {
      id: "faction-b",
      name: "勢力B（赤）",
    };
    const factionC: Faction = {
      id: "faction-c",
      name: "勢力C（緑）",
    };
    const factionD: Faction = {
      id: "faction-d",
      name: "勢力D（オレンジ）",
    };

    const cells = createEmptyBoard();
    const units = placeInitialUnits(cells, factionA, factionB, factionC, factionD);

    const gameState: GameState = {
      id: `game-${Date.now()}`,
      status: "playing",
      tick: 0,
      winnerId: null,
      factions: [factionA, factionB, factionC, factionD],
      units,
      cells,
    };

    // バリデーション
    if (!gameState.cells || !Array.isArray(gameState.cells)) {
      throw new Error("Invalid cells structure");
    }
    if (!gameState.units || !Array.isArray(gameState.units)) {
      throw new Error("Invalid units structure");
    }
    if (!gameState.factions || !Array.isArray(gameState.factions)) {
      throw new Error("Invalid factions structure");
    }

    return gameState;
  } catch (error) {
    console.error("Error in createNewGame:", error);
    throw error;
  }
}

