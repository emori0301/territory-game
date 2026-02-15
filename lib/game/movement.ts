// 移動処理

import { MOVE_DISTANCE, ENEMY_DETECTION_RANGE } from "./constants";
import { getNextPosition, getRandomDirection, isValidPosition, canPassTerrain, getTerrainValueCost, calculateDirection } from "./utils";
import { manhattanDistance, getNearbyAlliesValue, findNearestEnemy, findNearestAlly, getValidDirections, getDirectionTowardsEnemy, getDirectionTowardsTarget } from "./movementHelpers";
import type { GameState, MoveIntent, Unit } from "./types";

/**
 * 特性に応じた移動方向を決定
 * 停滞を防ぐため、特性の影響を60%に制限し、残りはランダムまたは塗られていないマスを優先
 */
function getStrategicDirection(
  unit: Unit,
  gameState: GameState,
): "up" | "down" | "left" | "right" {
  try {
    // 隣接する敵がいる場合は移動しない（戦闘を継続）
    const adjacentPositions = [
      { x: unit.x, y: unit.y - 1 }, // 上
      { x: unit.x, y: unit.y + 1 }, // 下
      { x: unit.x - 1, y: unit.y }, // 左
      { x: unit.x + 1, y: unit.y }, // 右
    ];
    
    for (const pos of adjacentPositions) {
      if (!isValidPosition(pos.x, pos.y, gameState.boardSize)) continue;
      const enemyUnit = gameState.units.find(
        (u) => u.id !== unit.id && 
               u.factionId !== unit.factionId && 
               u.x === pos.x && 
               u.y === pos.y &&
               !u.inCombat
      );
      if (enemyUnit) {
        // 隣接する敵がいる場合は移動しない（その場で戦闘を継続）
        // ランダムな方向を返すが、実際には移動しない（戦闘中のため）
        return getRandomDirection();
      }
    }
    
    const directions: Array<"up" | "down" | "left" | "right"> = [
      "up",
      "down",
      "left",
      "right",
    ];

    // 英雄の特別な行動: 果敢に相手陣地に攻める
    if (unit.isHero) {
      const enemyTerritoryDirections: Array<"up" | "down" | "left" | "right"> = [];
      
      for (const dir of directions) {
        const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
        if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
        const cell = gameState.cells[nextPos.y]?.[nextPos.x];
        if (!cell) continue;
        
        // 地形チェック
        if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
        
        // 移動先にコマがいないかチェック（敵の場合は移動を試みる）
        const blockingUnit = gameState.units.find(
          (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
        );
        
        // 相手陣地（自勢力でない、かつ誰かの領地）を優先
        if (cell.ownerFactionId !== null && cell.ownerFactionId !== unit.factionId) {
          // 敵コマがいても移動を試みる（戦闘が発生する）
          enemyTerritoryDirections.push(dir);
        }
      }
      
      // 相手陣地がある方向があれば、そこへ移動
      if (enemyTerritoryDirections.length > 0) {
        return enemyTerritoryDirections[
          Math.floor(Math.random() * enemyTerritoryDirections.length)
        ]!;
      }
      
      // 相手陣地がない場合は敵コマを探す
      let nearestEnemy: Unit | null = null;
      let minDistance = Infinity;
      const detectionRange = 15; // 英雄は広範囲を検出

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
    }

    // 周囲の9以下の味方コマが英雄に合体する処理
    // 英雄がいる場合、周囲の味方が英雄に向かう
    if (!unit.isHero && unit.value <= 9) {
      const nearbyHeroes = gameState.units.filter(
        (u) => u.isHero && 
               u.factionId === unit.factionId && 
               u.id !== unit.id &&
               manhattanDistance(unit.x, unit.y, u.x, u.y) <= 2
      );
      
      if (nearbyHeroes.length > 0) {
        // 最も近い英雄に向かう
        let nearestHero: Unit | null = null;
        let minDistance = Infinity;
        
        for (const hero of nearbyHeroes) {
          const distance = manhattanDistance(unit.x, unit.y, hero.x, hero.y);
          if (distance < minDistance) {
            minDistance = distance;
            nearestHero = hero;
          }
        }
        
        if (nearestHero) {
          return getDirectionTowardsTarget(unit, nearestHero);
        }
      }
    }

    // 特性の影響を70%に引き上げ（より攻撃的に）
    const traitInfluence = 0.7;
    const useTraitBehavior = Math.random() < traitInfluence;

    // 特性に応じた行動（60%の確率で実行）
    if (useTraitBehavior) {
      switch (unit.trait) {
        case "warrior": {
          // 戦士: 周囲10マス以内の敵を探して積極的に向かう（より攻撃的に）
          const detectionRange = 10; // 検出範囲を拡大
          const nearestEnemy = findNearestEnemy(unit, gameState, detectionRange);

          if (nearestEnemy) {
            return getDirectionTowardsEnemy(unit, nearestEnemy);
          }
          // 敵がいない場合はフォールバックに進む
          break;
        }

        case "berserker": {
          // 狂戦士: valueが低いほど積極的に敵に向かう（カオス）
          // valueが低いほど遠くの敵も攻撃対象にする
          const detectionRange = unit.value < 5 ? 15 : unit.value < 10 ? 10 : ENEMY_DETECTION_RANGE;
          const nearestEnemy = findNearestEnemy(unit, gameState, detectionRange);

          if (nearestEnemy) {
            return getDirectionTowardsEnemy(unit, nearestEnemy);
          }
          // 敵がいない場合はフォールバックに進む
          break;
        }

        case "wanderer": {
          // 放浪者: 確率を下げる（50%の確率でランダムに動く）
          // 残り50%は塗られていないマスを優先
          if (Math.random() < 0.5) {
            return getRandomDirection();
          }
          // フォールバックに進む（塗られていないマスを優先）
          break;
        }

        case "scout": {
          // 斥候: 塗られていない土地を塗ることを優先、周囲になければ侵略者と同様の動き
          // まず塗られていない土地を探す
          const unpaintedDirections: Array<"up" | "down" | "left" | "right"> = [];
          
          for (const dir of directions) {
            const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
            if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
            const cell = gameState.cells[nextPos.y]?.[nextPos.x];
            if (!cell) continue;
            
            // 地形チェック
            if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
            
            // 移動先にコマがいないかチェック
            const hasUnit = gameState.units.some(
              (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
            );
            if (hasUnit) continue;
            
            // 塗られていない土地を優先
            if (cell.ownerFactionId === null) {
              unpaintedDirections.push(dir);
            }
          }
          
          // 塗られていない土地があれば、そこへ移動
          if (unpaintedDirections.length > 0) {
            return unpaintedDirections[
              Math.floor(Math.random() * unpaintedDirections.length)
            ]!;
          }
          
          // 塗られていない土地がない場合は侵略者と同様の動き（相手陣地を優先）
          const enemyTerritoryDirections: Array<"up" | "down" | "left" | "right"> = [];
          
          for (const dir of directions) {
            const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
            if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
            const cell = gameState.cells[nextPos.y]?.[nextPos.x];
            if (!cell) continue;
            
            // 地形チェック
            if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
            
            // 移動先にコマがいないかチェック
            const hasUnit = gameState.units.some(
              (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
            );
            if (hasUnit) continue;
            
            // 相手陣地（自勢力でない、かつ誰かの領地）を優先
            if (cell.ownerFactionId !== null && cell.ownerFactionId !== unit.factionId) {
              enemyTerritoryDirections.push(dir);
            }
          }
          
          // 相手陣地がある方向があれば、そこへ移動
          if (enemyTerritoryDirections.length > 0) {
            return enemyTerritoryDirections[
              Math.floor(Math.random() * enemyTerritoryDirections.length)
            ]!;
          }
          // 相手陣地がない場合はフォールバックに進む
          break;
        }

        case "craftsman": {
          // 職人: 塗られていないマス+相手陣地を塗ることを優先
          const unpaintedOrEnemyDirections: Array<"up" | "down" | "left" | "right"> = [];
          
          for (const dir of directions) {
            const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
            if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
            const cell = gameState.cells[nextPos.y]?.[nextPos.x];
            if (!cell) continue;
            
            // 地形チェック
            if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
            
            // 移動先にコマがいないかチェック
            const hasUnit = gameState.units.some(
              (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
            );
            if (hasUnit) continue;
            
            // 塗られていないマスまたは相手陣地を優先
            if (cell.ownerFactionId === null || cell.ownerFactionId !== unit.factionId) {
              unpaintedOrEnemyDirections.push(dir);
            }
          }
          
          // 塗られていないマスまたは相手陣地があれば、そこへ移動
          if (unpaintedOrEnemyDirections.length > 0) {
            return unpaintedOrEnemyDirections[
              Math.floor(Math.random() * unpaintedOrEnemyDirections.length)
            ]!;
          }
          // フォールバックに進む
          break;
        }

        case "invader": {
          // 侵略者: 相手陣地の塗りを優先
          // 相手陣地がある方向を探す
          const enemyTerritoryDirections: Array<"up" | "down" | "left" | "right"> = [];
          
          for (const dir of directions) {
            const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
            if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
            const cell = gameState.cells[nextPos.y]?.[nextPos.x];
            if (!cell) continue;
            
            // 地形チェック
            if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
            
            // 移動先にコマがいないかチェック
            const hasUnit = gameState.units.some(
              (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
            );
            if (hasUnit) continue;
            
            // 相手陣地（自勢力でない、かつ誰かの領地）を優先
            if (cell.ownerFactionId !== null && cell.ownerFactionId !== unit.factionId) {
              enemyTerritoryDirections.push(dir);
            }
          }
          
          // 相手陣地がある方向があれば、そこへ移動
          if (enemyTerritoryDirections.length > 0) {
            return enemyTerritoryDirections[
              Math.floor(Math.random() * enemyTerritoryDirections.length)
            ]!;
          }
          // 相手陣地がない場合はフォールバックに進む
          break;
        }

        case "normal":
        default: {
          // 通常: 周囲に味方がいなければ塗られていない陣地または相手の陣地を塗りに行き、味方がいれば合体しに行く
          // 周囲の味方をチェック（周囲2マス）
          const nearestAlly = findNearestAlly(unit, gameState, 2);
          
          // 味方がいる場合は合体しに行く（最も近い味方に向かう）
          if (nearestAlly) {
            return getDirectionTowardsTarget(unit, nearestAlly);
          }
          
          // 味方がいない場合は塗られていない陣地または相手の陣地を塗りに行く
          const unpaintedOrEnemyDirections: Array<"up" | "down" | "left" | "right"> = [];
          
          for (const dir of directions) {
            const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
            if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;
            const cell = gameState.cells[nextPos.y]?.[nextPos.x];
            if (!cell) continue;
            
            // 地形チェック
            if (!canPassTerrain(cell.terrain, unit.isHero)) continue;
            
            // 移動先にコマがいないかチェック
            const hasUnit = gameState.units.some(
              (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
            );
            if (hasUnit) continue;
            
            // 塗られていない陣地または相手の陣地を優先
            if (cell.ownerFactionId === null || cell.ownerFactionId !== unit.factionId) {
              unpaintedOrEnemyDirections.push(dir);
            }
          }
          
          // 塗られていない陣地または相手の陣地があれば、そこへ移動
          if (unpaintedOrEnemyDirections.length > 0) {
            return unpaintedOrEnemyDirections[
              Math.floor(Math.random() * unpaintedOrEnemyDirections.length)
            ]!;
          }
          
          // フォールバック
          break;
        }
      }
    }

    // フォールバック: より攻撃的に、敵を優先して移動
    // まず、近くの敵を探す（より攻撃的に）
    const enemyDetectionRange = 8; // 検出範囲を拡大
    const nearestEnemy = findNearestEnemy(unit, gameState, enemyDetectionRange);

    // 敵がいる場合、敵に向かう方向を優先
    if (nearestEnemy) {
      const direction = getDirectionTowardsEnemy(unit, nearestEnemy);
      const nextPos = getNextPosition(unit.x, unit.y, direction, MOVE_DISTANCE);
      if (isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) {
        const cell = gameState.cells[nextPos.y]?.[nextPos.x];
        if (cell && canPassTerrain(cell.terrain, unit.isHero)) {
          const hasUnit = gameState.units.some(
            (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
          );
          if (!hasUnit) {
            return direction; // 敵に向かう方向が有効なら採用
          }
        }
      }
    }

    // 塗られていないマスを優先、停滞を防ぐため必ず移動
    const unpaintedDirections: Array<"up" | "down" | "left" | "right"> = [];
    const enemyTerritoryDirections: Array<"up" | "down" | "left" | "right"> = [];
    const paintedDirections: Array<"up" | "down" | "left" | "right"> = [];
    const allValidDirections: Array<"up" | "down" | "left" | "right"> = [];

    for (const dir of directions) {
      const nextPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
      if (!isValidPosition(nextPos.x, nextPos.y, gameState.boardSize)) continue;

      const cell = gameState.cells[nextPos.y]?.[nextPos.x];
      if (!cell) continue;

      // 地形チェック（英雄は水を通れる、山は通れない）
      if (!canPassTerrain(cell.terrain, unit.isHero)) continue;

      // 移動先にコマがいないかチェック（戦闘中のコマは無視）
      const hasUnit = gameState.units.some(
        (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
      );

      // 他のコマがいても、敵の場合は移動を試みる（戦闘が発生する）
      if (hasUnit) {
        const blockingUnit = gameState.units.find(
          (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
        );
        // 敵の場合は移動を試みる（戦闘が発生する）
        if (blockingUnit && blockingUnit.factionId !== unit.factionId) {
          allValidDirections.push(dir);
          continue;
        }
        // 味方の場合はスキップ
        continue;
      }

      // 全ての有効な方向を記録
      allValidDirections.push(dir);

      if (cell.ownerFactionId === null) {
        unpaintedDirections.push(dir);
      } else if (cell.ownerFactionId !== unit.factionId) {
        enemyTerritoryDirections.push(dir); // 相手陣地
      } else {
        paintedDirections.push(dir); // 自陣地
      }
    }

    // 優先順位: 相手陣地 > 塗られていないマス > 自陣地 > ランダム
    if (enemyTerritoryDirections.length > 0) {
      return enemyTerritoryDirections[
        Math.floor(Math.random() * enemyTerritoryDirections.length)
      ]!;
    }

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

    // 有効な方向があればそこへ移動（停滞を防ぐ）
    if (allValidDirections.length > 0) {
      return allValidDirections[
        Math.floor(Math.random() * allValidDirections.length)
      ]!;
    }

    // 全て埋まっている場合でも、敵のいる方向に移動を試みる（戦闘が発生する）
    // これにより停滞を防ぐ
    if (nearestEnemy) {
      return getDirectionTowardsEnemy(unit, nearestEnemy);
    }

    // それでも動けない場合はランダム（衝突は後で処理される）
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
    
    // ユーザー命令がある場合は優先（プレイヤー勢力のコマのみ）
    if (
      gameState.userCommands?.length &&
      gameState.playerFactionId &&
      unit.factionId === gameState.playerFactionId
    ) {
      const userCommand = gameState.userCommands.find(cmd => cmd.unitId === unit.id);
      if (userCommand) {
        let direction: "up" | "down" | "left" | "right" | null = null;
        
        if (userCommand.type === "move" && userCommand.targetX !== undefined && userCommand.targetY !== undefined) {
          // 移動命令: 目標位置に向かって移動
          direction = calculateDirection(unit.x, unit.y, userCommand.targetX, userCommand.targetY);
        } else if (userCommand.type === "attack" && userCommand.targetUnitId) {
          // 攻撃命令: 目標コマに向かって移動
          const targetUnit = gameState.units.find(u => u.id === userCommand.targetUnitId);
          if (targetUnit) {
            direction = calculateDirection(unit.x, unit.y, targetUnit.x, targetUnit.y);
          }
        }
        
        if (direction) {
          intents.push({
            unitId: unit.id,
            direction,
          });
          continue;
        }
      }
    }
    
    // ユーザー命令がない場合、またはプレイヤー勢力でない場合は通常のAI行動
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
    
    const cell = gameState.cells[nextPos.y]?.[nextPos.x];
    
    // 地形チェックは移動解決時に行う（ここでは緩和）
    // 地形を通れない場合でも、移動意図は保持（後でtick.tsで処理される）
    if (!cell) {
      moveResults.set(intent.unitId, { x: unit.x, y: unit.y });
      continue;
    }
    
    // 移動先に他のコマがいるかチェック
    const hasOtherUnit = gameState.units.some(
      (u) => u.id !== unit.id && u.x === nextPos.x && u.y === nextPos.y && !u.inCombat
    );

    if (!hasOtherUnit && !occupiedPositions.has(posKey)) {
      moveResults.set(intent.unitId, nextPos);
      occupiedPositions.add(posKey);
    } else {
      // 移動先が埋まっている場合は、別の方向を積極的に試す（停滞を防ぐ）
      const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
      // ランダムにシャッフルして、より多様な移動を促す
      const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
      let moved = false;
      
      for (const dir of shuffledDirections) {
        const altPos = getNextPosition(unit.x, unit.y, dir, MOVE_DISTANCE);
        const altPosKey = `${altPos.x},${altPos.y}`;
        const altCell = gameState.cells[altPos.y]?.[altPos.x];
        
        if (!altCell || !canPassTerrain(altCell.terrain, unit.isHero)) continue;
        
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
      
      // 全ての方向が埋まっている場合でも、ランダムな方向に移動を試みる（衝突処理に任せる）
      // これにより停滞を防ぐ
      if (!moved) {
        const randomDir = getRandomDirection();
        const randomPos = getNextPosition(unit.x, unit.y, randomDir, MOVE_DISTANCE);
        moveResults.set(intent.unitId, randomPos);
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

