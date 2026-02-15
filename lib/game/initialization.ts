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
  
  // 周囲に水がある場合は水の出現確率を上げる（減らす）
  if (hasNearbyWater && rand < 0.15) {
    return "water";
  }
  
  if (rand < 0.90) return "plain"; // 90% 平地
  if (rand < 0.92) return "water"; // 2% 水（単独でも出現、大幅に減らす）
  if (rand < 0.95) return "rock"; // 3% 岩
  if (rand < 0.97) return "tree"; // 2% 木
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
        baseId: null,
        baseFactionId: null,
        baseCreatedTick: null,
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
  factionA: Faction | null,
  factionB: Faction | null,
  factionC: Faction | null,
  factionD: Faction | null,
  boardSize: number = BOARD_SIZE,
  factionCount: number = 4,
): Unit[] {
  const units: Unit[] = [];
  let unitIdCounter = 0;
  const cornerSize = Math.floor(boardSize / 3);

  // 各勢力の配置位置を定義
  const factionPositions = [
    { faction: factionA, xRange: [0, cornerSize - 1], yRange: [0, cornerSize - 1] }, // 左上
    { faction: factionB, xRange: [boardSize - cornerSize, boardSize - 1], yRange: [0, cornerSize - 1] }, // 右上
    { faction: factionC, xRange: [0, cornerSize - 1], yRange: [boardSize - cornerSize, boardSize - 1] }, // 左下
    { faction: factionD, xRange: [boardSize - cornerSize, boardSize - 1], yRange: [boardSize - cornerSize, boardSize - 1] }, // 右下
  ];

  // 指定された数の勢力のみ配置
  for (let f = 0; f < factionCount; f++) {
    const factionPos = factionPositions[f];
    if (!factionPos || !factionPos.faction) continue;

    for (let i = 0; i < INITIAL_UNITS_PER_FACTION; i++) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const x = randomInt(factionPos.xRange[0]!, factionPos.xRange[1]!);
        const y = randomInt(factionPos.yRange[0]!, factionPos.yRange[1]!);
        const cell = cells[y]?.[x];
        // 水地形や岩地形の上には配置しない（平地、木、沼地、山のみ）
        if (cell && cell.unitId === null && cell.terrain !== "water" && cell.terrain !== "rock") {
          const sex = getRandomSex();
          const unit: Unit = {
            id: `unit-${unitIdCounter++}`,
            factionId: factionPos.faction!.id,
            x,
            y,
            sex,
            value: INITIAL_UNIT_VALUE,
            isHero: false,
            trait: "builder", // 初期コマは拠点作成を優先
            inCombat: false,
          };
          units.push(unit);
          cells[y]![x]!.unitId = unit.id;
          placed = true;
        }
      }
    }
  }

  return units;
}

/**
 * ランダムな勢力名を取得
 */
function getRandomFactionName(): string {
  const names = [
    "アヴァロン王国", "ドラゴン帝国", "フェアリー共和国", "エルフ連邦",
    "ドワーフ同盟", "オーク部族", "人間王国", "魔法帝国",
    "聖騎士団", "暗黒軍団", "竜騎士団", "精霊の森",
    "鋼鉄の都", "氷の王国", "炎の帝国", "雷の共和国",
    "風の連邦", "大地の王国", "光の帝国", "闇の共和国",
  ];
  return names[Math.floor(Math.random() * names.length)]!;
}

/**
 * 新しいゲーム状態を作成
 */
export function createNewGame(boardSize: number = BOARD_SIZE, factionCount: number = 4): GameState {
  try {
    // 指定された数の異なる勢力名をランダムに選ぶ
    const selectedNames = new Set<string>();
    while (selectedNames.size < factionCount) {
      selectedNames.add(getRandomFactionName());
    }
    const namesArray = Array.from(selectedNames);
    
    const factions: Faction[] = [];
    const factionColors = [
      { id: "faction-a", name: "（青）", color: "青" },
      { id: "faction-b", name: "（赤）", color: "赤" },
      { id: "faction-c", name: "（緑）", color: "緑" },
      { id: "faction-d", name: "（オレンジ）", color: "オレンジ" },
    ];
    
    for (let i = 0; i < factionCount; i++) {
      factions.push({
        id: factionColors[i]!.id,
        name: `${namesArray[i]}${factionColors[i]!.name}`,
      });
    }

    const cells = createEmptyBoard(boardSize);
    const units = placeInitialUnits(
      cells,
      factions[0] || null,
      factions[1] || null,
      factions[2] || null,
      factions[3] || null,
      boardSize,
      factionCount
    );

    const gameState: GameState = {
      id: `game-${Date.now()}`,
      status: "playing",
      tick: 0,
      winnerId: null,
      factions,
      units,
      cells,
      boardSize,
      playerFactionId: null, // ゲーム開始時は未設定
      userCommands: [], // ユーザー命令は空
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

