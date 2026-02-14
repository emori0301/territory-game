// ゲームユーティリティ関数

import { BOARD_SIZE } from "./constants";
import type { Cell, Unit } from "./types";

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
 */
export function getRandomTrait(sex?: "male" | "female"): UnitTrait {
  let traits: UnitTrait[];
  
  if (sex === "female") {
    // 雌は攻撃的な特性（aggressive, berserker, kamikaze）を除外
    traits = ["painter", "wanderer", "scout", "normal"];
  } else {
    // 雄は全ての特性から選択
    traits = ["painter", "aggressive", "berserker", "wanderer", "kamikaze", "scout", "normal"];
  }
  
  return traits[Math.floor(Math.random() * traits.length)]!;
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

