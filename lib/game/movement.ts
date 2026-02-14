// 移動処理

import { MOVE_DISTANCE, ENEMY_DETECTION_RANGE } from "./constants";
import { getNextPosition, getRandomDirection, isValidPosition, canPassTerrain, getTerrainValueCost } from "./utils";
import type { GameState, MoveIntent, Unit } from "./types";

/**
 * マンハッタン距離を計算
 */
function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 周囲の味方コマの合計valueを計算
 */
function getNearbyAlliesValue(
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
 * 特性に応じた移動方向を決定
 */
function getStrategicDirection(
  unit: Unit,
  gameState: GameState,
): "up" | "down" | "left" | "right" {
  try {
    const directions: Array<"up" | "down" | "left" | "right"> = [
      "up",
      "down",
      "left",
      "right",
    ];

    // 特性に応じた行動
    switch (unit.trait) {
      case "aggressive": {
        // 攻撃的: 周囲5マス以内に敵がいる場合のみ敵に向かう
        let nearestEnemy: Unit | null = null;
        let minDistance = Infinity;

        for (const otherUnit of gameState.units) {
          if (otherUnit.factionId === unit.factionId) continue;

          const distance = manhattanDistance(
            unit.x,
            unit.y,
            otherUnit.x,
            otherUnit.y,
          );
          if (distance <= ENEMY_DETECTION_RANGE && distance < minDistance) {
            minDistance = distance;
            nearestEnemy = otherUnit;
          }
        }

        if (nearestEnemy) {
          const dx = nearestEnemy.x - unit.x;
          const dy = nearestEnemy.y - unit.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
          } else {
            return dy > 0 ? "down" : "up";
          }
        }
        // 敵がいない場合は塗られていないマスを優先
        break;
      }

      case "berserker": {
        // 狂戦士: valueが低いほど積極的に敵に向かう（カオス）
        // valueが低いほど遠くの敵も攻撃対象にする
        const detectionRange = unit.value < 5 ? 15 : unit.value < 10 ? 10 : ENEMY_DETECTION_RANGE;
        
        let nearestEnemy: Unit | null = null;
        let minDistance = Infinity;

        for (const otherUnit of gameState.units) {
          if (otherUnit.factionId === unit.factionId) continue;

          const distance = manhattanDistance(
            unit.x,
            unit.y,
            otherUnit.x,
            otherUnit.y,
          );
          if (distance <= detectionRange && distance < minDistance) {
            minDistance = distance;
            nearestEnemy = otherUnit;
          }
        }

        if (nearestEnemy) {
          const dx = nearestEnemy.x - unit.x;
          const dy = nearestEnemy.y - unit.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
          } else {
            return dy > 0 ? "down" : "up";
          }
        }
        // 敵がいない場合はランダムに動く（カオス）
        return getRandomDirection();
      }

      case "wanderer": {
        // 放浪者: 完全にランダムに動く（カオス）
        return getRandomDirection();
      }

      case "kamikaze": {
        // 特攻: valueが低いと敵に突進、valueが高いと逃げる（カオス）
        let nearestEnemy: Unit | null = null;
        let minDistance = Infinity;

        for (const otherUnit of gameState.units) {
          if (otherUnit.factionId === unit.factionId) continue;

          const distance = manhattanDistance(
            unit.x,
            unit.y,
            otherUnit.x,
            otherUnit.y,
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = otherUnit;
          }
        }

        if (nearestEnemy) {
          const dx = nearestEnemy.x - unit.x;
          const dy = nearestEnemy.y - unit.y;
          
          if (unit.value < 8) {
            // valueが低い: 敵に突進
            if (Math.abs(dx) > Math.abs(dy)) {
              return dx > 0 ? "right" : "left";
            } else {
              return dy > 0 ? "down" : "up";
            }
          } else {
            // valueが高い: 敵から逃げる
            if (Math.abs(dx) > Math.abs(dy)) {
              return dx > 0 ? "left" : "right";
            } else {
              return dy > 0 ? "up" : "down";
            }
          }
        }
        // 敵がいない場合はランダム
        return getRandomDirection();
      }

      case "scout": {
        // 斥候: 遠くの敵を探して移動（カオス）
        let farthestEnemy: Unit | null = null;
        let maxDistance = 0;

        for (const otherUnit of gameState.units) {
          if (otherUnit.factionId === unit.factionId) continue;

          const distance = manhattanDistance(
            unit.x,
            unit.y,
            otherUnit.x,
            otherUnit.y,
          );
          // 遠くの敵を優先（ただし盤面内）
          if (distance > maxDistance && distance > 5) {
            maxDistance = distance;
            farthestEnemy = otherUnit;
          }
        }

        if (farthestEnemy) {
          const dx = farthestEnemy.x - unit.x;
          const dy = farthestEnemy.y - unit.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
          } else {
            return dy > 0 ? "down" : "up";
          }
        }
        // 遠くの敵がいない場合は塗られていないマスを優先
        break;
      }

      case "painter": {
        // 塗り優先: 塗られていないマスを優先
        break;
      }

      case "normal":
      default: {
        // 通常: 30%の確率でランダム
        if (Math.random() < 0.3) {
          return getRandomDirection();
        }
        break;
      }
    }

    // 塗られていないマスを優先（painter、aggressive、scoutのフォールバック）
    // 停滞を防ぐため、移動可能な方向を全てチェック
    const unpaintedDirections: Array<"up" | "down" | "left" | "right"> = [];
    const paintedDirections: Array<"up" | "down" | "left" | "right"> = [];
    const emptyDirections: Array<"up" | "down" | "left" | "right"> = [];

    for (const dir of directions) {
      const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
      if (!isValidPosition(nextPos.x, nextPos.y)) continue;

      const cell = gameState.cells[nextPos.y]?.[nextPos.x];
      if (!cell) continue;

      // 移動先にコマがいないかチェック
      const hasUnit = gameState.units.some(
        (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
      );

      if (hasUnit) continue; // 他のコマがいる場合はスキップ

      if (cell.ownerFactionId !== unit.factionId) {
        unpaintedDirections.push(dir);
      } else {
        paintedDirections.push(dir);
      }
      emptyDirections.push(dir);
    }

    // 優先順位: 塗られていないマス > 塗られているマス > ランダム
    if (unpaintedDirections.length > 0) {
      return unpaintedDirections[
        Math.floor(Math.random() * unpaintedDirections.length)
      ]!;
    }

    if (paintedDirections.length > 0) {
      return paintedDirections[
        Math.floor(Math.random() * paintedDirections.length)
      ]!;
    }

    // 空きマスがあればそこへ移動
    if (emptyDirections.length > 0) {
      return emptyDirections[
        Math.floor(Math.random() * emptyDirections.length)
      ]!;
    }

    // 全て埋まっている場合はランダム（衝突は後で処理される）
    return getRandomDirection();
  } catch (error) {
    console.error("Error in getStrategicDirection:", error);
    return getRandomDirection();
  }
}

/**
 * 全コマの移動意図を生成（より戦略的に）
 * 戦闘中のコマは移動しない
 */
export function generateMoveIntents(gameState: GameState): MoveIntent[] {
  const intents: MoveIntent[] = [];
  for (const unit of gameState.units) {
    // 戦闘中のコマは移動しない
    if (unit.inCombat) continue;
    
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
 * 停滞を防ぐため、移動先が埋まっている場合は別の方向を試す
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
  const occupiedPositions = new Set<string>();

  // まず全ての移動意図を処理
  for (const intent of intents) {
    const unit = unitMap.get(intent.unitId);
    if (!unit) continue;

    const nextPos = getNextPosition(unit.x, unit.y, intent.direction, MOVE_DISTANCE);
    const posKey = `${nextPos.x},${nextPos.y}`;
    
    // 移動先に他のコマがいるかチェック
    const hasOtherUnit = gameState.units.some(
      (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
    );

    if (!hasOtherUnit && !occupiedPositions.has(posKey)) {
      moveResults.set(intent.unitId, nextPos);
      occupiedPositions.add(posKey);
    } else {
      // 移動先が埋まっている場合は、別の方向を試す
      const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
      let moved = false;
      
      for (const dir of directions) {
        const altPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
        const altPosKey = `${altPos.x},${altPos.y}`;
        
        const hasOtherUnitAlt = gameState.units.some(
          (u) => u.id !== unit.id && u.x === altPos.x && u.y === altPos.y && !u.inCombat
        );
        
        if (!hasOtherUnitAlt && !occupiedPositions.has(altPosKey)) {
          moveResults.set(intent.unitId, altPos);
          occupiedPositions.add(altPosKey);
          moved = true;
          break;
        }
      }
      
      // 全ての方向が埋まっている場合は元の位置に留まる（衝突処理に任せる）
      if (!moved) {
        moveResults.set(intent.unitId, { x: unit.x, y: unit.y });
      }
    }
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

