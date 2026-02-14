// 移動処理

import { MOVE_DISTANCE } from "./constants";
import { getNextPosition, getRandomDirection, isValidPosition } from "./utils";
import type { GameState, MoveIntent, Unit } from "./types";

/**
 * より戦略的な移動方向を決定
 * - 70%の確率で敵の方向または領地の外側に向かう
 * - 30%の確率でランダム
 */
function getStrategicDirection(
  unit: Unit,
  gameState: GameState,
): "up" | "down" | "left" | "right" {
  // ランダム移動の確率
  if (Math.random() < 0.3) {
    return getRandomDirection();
  }

  // 敵の方向を探す
  let nearestEnemy: Unit | null = null;
  let minDistance = Infinity;

  for (const otherUnit of gameState.units) {
    if (otherUnit.factionId === unit.factionId) continue;

    const dx = otherUnit.x - unit.x;
    const dy = otherUnit.y - unit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance && distance > 0) {
      minDistance = distance;
      nearestEnemy = otherUnit;
    }
  }

  // 敵がいる場合は敵の方向に向かう
  if (nearestEnemy) {
    const dx = nearestEnemy.x - unit.x;
    const dy = nearestEnemy.y - unit.y;

    // より大きい方向に移動
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  // 敵がいない場合は、自分の領地の外側に向かう
  const directions: Array<"up" | "down" | "left" | "right"> = [
    "up",
    "down",
    "left",
    "right",
  ];
  const validDirections: Array<"up" | "down" | "left" | "right"> = [];

  for (const dir of directions) {
    const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
    if (!isValidPosition(nextPos.x, nextPos.y)) continue;

    const cell = gameState.cells[nextPos.y]?.[nextPos.x];
    // 自分の領地でない方向を優先
    if (!cell || cell.ownerFactionId !== unit.factionId) {
      validDirections.push(dir);
    }
  }

  if (validDirections.length > 0) {
    return validDirections[Math.floor(Math.random() * validDirections.length)]!;
  }

  // フォールバック: ランダム
  return getRandomDirection();
}

/**
 * 全コマの移動意図を生成（より戦略的に）
 */
export function generateMoveIntents(gameState: GameState): MoveIntent[] {
  const intents: MoveIntent[] = [];
  for (const unit of gameState.units) {
    const direction = getStrategicDirection(unit, gameState);
    intents.push({
      unitId: unit.id,
      direction,
    });
  }
  return intents;
}

/**
 * 移動意図を解決（移動先を計算）
 */
export function resolveMoveIntents(
  gameState: GameState,
  intents: MoveIntent[],
): Map<string, { x: number; y: number }> {
  const unitMap = new Map<string, Unit>();
  for (const unit of gameState.units) {
    unitMap.set(unit.id, unit);
  }

  const moveResults = new Map<string, { x: number; y: number }>();

  for (const intent of intents) {
    const unit = unitMap.get(intent.unitId);
    if (!unit) continue;

    const nextPos = getNextPosition(unit.x, unit.y, intent.direction, MOVE_DISTANCE);
    moveResults.set(intent.unitId, nextPos);
  }

  return moveResults;
}

/**
 * 衝突を検出（同一マスへの移動を集計）
 */
export function detectCollisions(
  moveResults: Map<string, { x: number; y: number }>,
): Map<string, string[]> {
  const collisions = new Map<string, string[]>();

  // マスごとにユニットIDを集計
  const cellToUnits = new Map<string, string[]>();
  for (const [unitId, pos] of moveResults.entries()) {
    const key = `${pos.x},${pos.y}`;
    if (!cellToUnits.has(key)) {
      cellToUnits.set(key, []);
    }
    cellToUnits.get(key)!.push(unitId);
  }

  // 複数のユニットがいるマスを衝突として記録
  for (const [key, unitIds] of cellToUnits.entries()) {
    if (unitIds.length > 1) {
      collisions.set(key, unitIds);
    }
  }

  return collisions;
}

