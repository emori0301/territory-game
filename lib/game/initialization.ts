// ゲーム初期化ロジック

import { BOARD_SIZE, INITIAL_UNITS_PER_FACTION, INITIAL_UNIT_VALUE } from "./constants";
import { getRandomSex, getRandomTrait, isValidPosition, randomInt } from "./utils";
import type { Cell, Faction, GameState, Unit, TerrainType } from "./types";

/**
 * ランダムな地形を生成（水は固まって出現）
 */
function getRandomTerrain(
  x: number,
  y: number,
  boardSize: number,
  cells: Cell[][],
): TerrainType {
  const rand = Math.random();
  
  // 水は周囲に水がある場合に出現しやすくする（固まって出現）
  const hasNearbyWater = (() => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
          const cell = cells[ny]?.[nx];
          if (cell?.terrain === "water") {
            return true;
          }
        }
      }
    }
    return false;
  })();
  
  // 周囲に水がある場合は水の出現確率を上げる
  if (hasNearbyWater && rand < 0.3) {
    return "water";
  }
  
  if (rand < 0.85) return "plain"; // 85% 平地
  if (rand < 0.90) return "water"; // 5% 水（単独でも出現）
  if (rand < 0.94) return "rock"; // 4% 岩
  if (rand < 0.97) return "tree"; // 3% 木
  if (rand < 0.99) return "swamp"; // 2% 沼地
  return "mountain"; // 1% 山
}

/**
 * 空の盤面を作成（地形を含む、水は固まって出現）
 */
export function createEmptyBoard(boardSize: number = BOARD_SIZE): Cell[][] {
  const cells: Cell[][] = [];
  
  // まず全てを平地で初期化
  for (let y = 0; y < boardSize; y++) {
    cells[y] = [];
    for (let x = 0; x < boardSize; x++) {
      cells[y]![x] = {
        x,
        y,
        ownerFactionId: null,
        unitId: null,
        terrain: "plain",
      };
    }
  }
  
  // 地形を生成（水は固まって出現するように）
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      cells[y]![x]!.terrain = getRandomTerrain(x, y, boardSize, cells);
    }
  }
  
  return cells;
}

/**
 * 初期コマを配置
 * 4勢力を四隅に配置
 * 勢力A: 左上
 * 勢力B: 右上
 * 勢力C: 左下
 * 勢力D: 右下
 */
export function placeInitialUnits(
  cells: Cell[][],
  factionA: Faction,
  factionB: Faction,
  factionC: Faction,
  factionD: Faction,
  boardSize: number = BOARD_SIZE,
): Unit[] {
  const units: Unit[] = [];
  let unitIdCounter = 0;

  // 勢力A（左上）
  const cornerSize = Math.floor(boardSize / 3);
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(0, cornerSize - 1);
      const y = randomInt(0, cornerSize - 1);
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
      const x = randomInt(boardSize - cornerSize, boardSize - 1);
      const y = randomInt(0, cornerSize - 1);
      if (cells[y]![x]!.unitId === null) {
        const sex = getRandomSex();
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionB.id,
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

  // 勢力C（左下）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(0, cornerSize - 1);
      const y = randomInt(boardSize - cornerSize, boardSize - 1);
      if (cells[y]![x]!.unitId === null) {
        const sex = getRandomSex();
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionC.id,
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

  // 勢力D（右下）
  for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
    let placed = false;
    while (!placed) {
      const x = randomInt(boardSize - cornerSize, boardSize - 1);
      const y = randomInt(boardSize - cornerSize, boardSize - 1);
      if (cells[y]![x]!.unitId === null) {
        const sex = getRandomSex();
        const unit: Unit = {
          id: `unit-${unitIdCounter++}`,
          factionId: factionD.id,
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

  return units;
}

/**
 * 新しいゲーム状態を作成
 */
export function createNewGame(boardSize: number = BOARD_SIZE): GameState {
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

    const cells = createEmptyBoard(boardSize);
    const units = placeInitialUnits(cells, factionA, factionB, factionC, factionD, boardSize);

    const gameState: GameState = {
      id: `game-${Date.now()}`,
      status: "playing",
      tick: 0,
      winnerId: null,
      factions: [factionA, factionB, factionC, factionD],
      units,
      cells,
      boardSize,
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

