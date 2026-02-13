// ゲーム初期化ロジック

import { BOARD_SIZE, INITIAL_UNITS_PER_FACTION, INITIAL_UNIT_VALUE } from "./constants";
import { getRandomSex, isValidPosition, randomInt } from "./utils";
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
 * 勢力A: 左上エリア (0-14, 0-14)
 * 勢力B: 右下エリア (15-29, 15-29)
 */
export function placeInitialUnits(
  cells: Cell[][],
  factionA: Faction,
  factionB: Faction,
): Unit[] {
  const units: Unit[] = [];
  let unitIdCounter = 0;

  // 勢力A（左上）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(0, 14);
      const y = randomInt(0, 14);
      if (cells[y]![x]!.unitId === null) {
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionA.id,
          x,
          y,
          sex: getRandomSex(),
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          age: 0,
        };
        units.push(unit);
        cells[y]![x]!.unitId = unit.id;
        placed = true;
      }
    }
  }

  // 勢力B（右下）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(15, 29);
      const y = randomInt(15, 29);
      if (cells[y]![x]!.unitId === null) {
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionB.id,
          x,
          y,
          sex: getRandomSex(),
          value: INITIAL_UNIT_VALUE,
          isHero: false,
          age: 0,
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
  const factionA: Faction = {
    id: "faction-a",
    name: "勢力A",
  };
  const factionB: Faction = {
    id: "faction-b",
    name: "勢力B",
  };

  const cells = createEmptyBoard();
  const units = placeInitialUnits(cells, factionA, factionB);

  return {
    id: `game-${Date.now()}`,
    status: "playing",
    tick: 0,
    winnerId: null,
    factions: [factionA, factionB],
    units,
    cells,
  };
}

