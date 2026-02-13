// ゲームユーティリティ関数

import { BOARD_SIZE } from "./constants";
import type { Cell, Unit } from "./types";

/**
 * 座標が盤面内かどうかをチェック
 */
export function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
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
 * 方向に基づいて次の座標を計算
 */
export function getNextPosition(
  x: number,
  y: number,
  direction: "up" | "down" | "left" | "right",
): { x: number; y: number } | null {
  let nextX = x;
  let nextY = y;

  switch (direction) {
    case "up":
      nextY -= 1;
      break;
    case "down":
      nextY += 1;
      break;
    case "left":
      nextX -= 1;
      break;
    case "right":
      nextX += 1;
      break;
  }

  if (isValidPosition(nextX, nextY)) {
    return { x: nextX, y: nextY };
  }
  return null;
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
    const next = getNextPosition(x, y, dir);
    if (next && cells[next.y]?.[next.x]?.unitId === null) {
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
    const next = getNextPosition(x, y, dir);
    if (next) {
      cells.push(next);
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

