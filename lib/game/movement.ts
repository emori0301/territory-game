// 移動処理

import { MOVE_DISTANCE } from "./constants";
import { getNextPosition, getRandomDirection } from "./utils";
import type { Cell, GameState, MoveIntent, Unit } from "./types";

/**
 * 全コマの移動意図を生成
 */
export function generateMoveIntents(gameState: GameState): MoveIntent[] {
  const intents: MoveIntent[] = [];
  for (const unit of gameState.units) {
    const direction = getRandomDirection();
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

