// ゲームユーティリティ関数

import { BOARD_SIZE } from "./constants";
import type { Cell, Unit, TerrainType, UnitTrait } from "./types";

/**
 * 2点間の移動方向を計算
 */
export function calculateDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): "up" | "down" | "left" | "right" | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  } else if (dy !== 0) {
    return dy > 0 ? "down" : "up";
  }
  
  return null;
}

/**
 * 座標が盤面内かどうかをチェック
 */
export function isValidPosition(x: number, y: number, boardSize: number = BOARD_SIZE): boolean {
  return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
}

/**
 * ランダムな方向を取得
 */
export function getRandomDirection(): "up" | "down" | "left" | "right" {
  const directions: Array<"up" | "down" | "left" | "right"> = [
    "up",
    "down",
    "left",
    "right",
  ];
  return directions[Math.floor(Math.random() * directions.length)]!;
}

/**
 * ランダムな特性を取得（性別を考慮）
 * 職人の割合を増やすため、craftsmanの確率を上げる
 */
export function getRandomTrait(sex?: "male" | "female"): UnitTrait {
  const rand = Math.random();
  
  if (sex === "female") {
    // 雌は攻撃的な特性（warrior, berserker）を除外
    // 職人を25%、侵略者を30%（確率上げ）、その他を45%に設定
    if (rand < 0.25) {
      return "craftsman";
    } else if (rand < 0.55) {
      return "invader"; // 侵略者（確率上げ）
    }
    const traits: UnitTrait[] = ["wanderer", "scout", "normal"];
    return traits[Math.floor(Math.random() * traits.length)]!;
  } else {
    // 雄は全ての特性から選択
    // 職人を20%、侵略者を30%（確率上げ）、戦士を20%、その他を30%に設定
    if (rand < 0.2) {
      return "craftsman";
    } else if (rand < 0.5) {
      return "invader"; // 侵略者（確率上げ）
    } else if (rand < 0.7) {
      // 攻撃的な特性
      const aggressiveTraits: UnitTrait[] = ["warrior", "berserker"];
      return aggressiveTraits[Math.floor(Math.random() * aggressiveTraits.length)]!;
    } else {
      // 放浪者の確率を下げる（10%）、その他を20%
      if (rand < 0.8) {
        return "wanderer";
      }
      const otherTraits: UnitTrait[] = ["scout", "normal"];
      return otherTraits[Math.floor(Math.random() * otherTraits.length)]!;
    }
  }
}

/**
 * 方向に基づいて次の座標を計算（複数マス移動可能）
 */
export function getNextPosition(
  x: number,
  y: number,
  direction: "up" | "down" | "left" | "right",
  distance: number = 2, // デフォルトで2マス移動
): { x: number; y: number } {
  let nextX = x;
  let nextY = y;

  switch (direction) {
    case "up":
      nextY -= distance;
      break;
    case "down":
      nextY += distance;
      break;
    case "left":
      nextX -= distance;
      break;
    case "right":
      nextX += distance;
      break;
  }

  if (isValidPosition(nextX, nextY)) {
    return { x: nextX, y: nextY };
  }
  // 盤外の場合は1マス移動を試す（再帰を避ける）
  if (distance > 1) {
    switch (direction) {
      case "up":
        nextY = y - 1;
        break;
      case "down":
        nextY = y + 1;
        break;
      case "left":
        nextX = x - 1;
        break;
      case "right":
        nextX = x + 1;
        break;
    }
    if (isValidPosition(nextX, nextY)) {
      return { x: nextX, y: nextY };
    }
  }
  // それでも盤外の場合はその場に留まる
  return { x, y };
}

/**
 * 隣接する空きマスを取得
 */
export function getAdjacentEmptyCells(
  x: number,
  y: number,
  cells: Cell[][],
): Array<{ x: number; y: number }> {
  const directions: Array<"up" | "down" | "left" | "right"> = [
    "up",
    "down",
    "left",
    "right",
  ];
  const emptyCells: Array<{ x: number; y: number }> = [];

  for (const dir of directions) {
    const next = getNextPosition(x, y, dir, 1); // 隣接は1マス
    if (cells[next.y]?.[next.x]?.unitId === null) {
      emptyCells.push(next);
    }
  }

  return emptyCells;
}

/**
 * 周囲1マス（上下左右）の座標を取得
 */
export function getSurroundingCells(
  x: number,
  y: number,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  const directions: Array<"up" | "down" | "left" | "right"> = [
    "up",
    "down",
    "left",
    "right",
  ];

  for (const dir of directions) {
    const next = getNextPosition(x, y, dir, 1); // 周囲は1マス
    cells.push(next);
  }

  return cells;
}

/**
 * 周囲8マス（上下左右+斜め）の座標を取得
 */
export function getSurrounding8Cells(
  x: number,
  y: number,
  boardSize: number = BOARD_SIZE,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue; // 自分自身は除外
      const nx = x + dx;
      const ny = y + dy;
      if (isValidPosition(nx, ny, boardSize)) {
        cells.push({ x: nx, y: ny });
      }
    }
  }
  
  return cells;
}

/**
 * ランダムな性別を取得
 */
export function getRandomSex(): "male" | "female" {
  return Math.random() < 0.5 ? "male" : "female";
}

/**
 * 2つの値の間でランダムな整数を取得
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 地形を通れるかチェック
 */
export function canPassTerrain(terrain: TerrainType, isHero: boolean): boolean {
  switch (terrain) {
    case "plain":
    case "rock":
    case "tree":
    case "swamp":
      return true;
    case "water":
      return isHero; // 英雄のみ水を通れる
    case "mountain":
      return false; // 山は通れない
    default:
      return true;
  }
}

/**
 * 地形によるvalue消費コストを取得
 */
export function getTerrainValueCost(terrain: TerrainType): number {
  switch (terrain) {
    case "plain":
      return 0;
    case "water":
      return 2; // 水はコストが高い
    case "rock":
      return 1;
    case "tree":
      return 1; // 木を切るコスト
    case "swamp":
      return 2; // 沼地はコストが高い
    case "mountain":
      return 999; // 山は通れないので高いコスト
    default:
      return 0;
  }
}

