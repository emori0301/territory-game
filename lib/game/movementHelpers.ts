// 移動処理のヘルパー関数

import { MOVE_DISTANCE } from "./constants";
import { getNextPosition, isValidPosition, canPassTerrain, calculateDirection } from "./utils";
import type { GameState, Unit } from "./types";

/**
 * マンハッタン距離を計算
 */
export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 周囲の味方コマの合計valueを計算
 */
export function getNearbyAlliesValue(
  unit: Unit,
  gameState: GameState,
  range: number = 2,
): number {
  let totalValue = 0;
  for (const otherUnit of gameState.units) {
    if (otherUnit.factionId !== unit.factionId) continue;
    if (otherUnit.id === unit.id) continue;

    const distance = manhattanDistance(unit.x, unit.y, otherUnit.x, otherUnit.y);
    if (distance <= range) {
      totalValue += otherUnit.value;
    }
  }
  return totalValue;
}

/**
 * 最も近い敵コマを検索
 */
export function findNearestEnemy(
  unit: Unit,
  gameState: GameState,
  detectionRange: number,
): Unit | null {
  let nearestEnemy: Unit | null = null;
  let minDistance = Infinity;

  for (const otherUnit of gameState.units) {
    if (otherUnit.factionId === unit.factionId) continue;

    const distance = manhattanDistance(unit.x, unit.y, otherUnit.x, otherUnit.y);
    if (distance <= detectionRange && distance < minDistance) {
      minDistance = distance;
      nearestEnemy = otherUnit;
    }
  }

  return nearestEnemy;
}

/**
 * 最も近い味方コマを検索
 */
export function findNearestAlly(
  unit: Unit,
  gameState: GameState,
  range: number = 2,
): Unit | null {
  let nearestAlly: Unit | null = null;
  let minDistance = Infinity;

  for (const otherUnit of gameState.units) {
    if (otherUnit.factionId !== unit.factionId) continue;
    if (otherUnit.id === unit.id) continue;

    const distance = manhattanDistance(unit.x, unit.y, otherUnit.x, otherUnit.y);
    if (distance <= range && distance < minDistance) {
      minDistance = distance;
      nearestAlly = otherUnit;
    }
  }

  return nearestAlly;
}

/**
 * 指定された条件に合う移動方向を取得
 */
export function getValidDirections(
  unit: Unit,
  gameState: GameState,
  filter: (cell: { x: number; y: number; cell: any }) => boolean,
): Array<"up" | "down" | "left" | "right"> {
  const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
  const validDirections: Array<"up" | "down" | "left" | "right"> = [];

  for (const dir of directions) {
    const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
    if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;

    const cell = gameState.cells[nextPos.y]?.[nextPos.x];
    if (!cell) continue;

    // 地形チェック
    if (!canPassTerrain(cell.terrain, unit.isHero)) continue;

    // 移動先にコマがいないかチェック（戦闘中のコマは無視）
    const hasUnit = gameState.units.some(
      (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
    );
    if (hasUnit) continue;

    if (filter({ x: nextPos.x, y: nextPos.y, cell })) {
      validDirections.push(dir);
    }
  }

  return validDirections;
}

/**
 * 敵または味方に向かう方向を計算
 */
export function getDirectionTowardsTarget(
  unit: Unit,
  target: Unit,
): "up" | "down" | "left" | "right" {
  const direction = calculateDirection(unit.x, unit.y, target.x, target.y);
  if (direction) {
    return direction;
  }
  // 同じ位置の場合はランダム（通常は発生しない）
  const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
  return directions[Math.floor(Math.random() * directions.length)]!;
}

/**
 * 敵に向かう方向を計算（後方互換性のため）
 */
export function getDirectionTowardsEnemy(
  unit: Unit,
  enemy: Unit,
): "up" | "down" | "left" | "right" {
  return getDirectionTowardsTarget(unit, enemy);
}

