// 勝利条件チェック

import { MAX_TICKS } from "./constants";
import type { GameState } from "./types";

/**
 * 勝利条件をチェック
 * - すべての相手の拠点を潰した場合
 * - 500日経過時に占有率が最も高い場合
 */
export function checkWinCondition(gameState: GameState): {
  status: "playing" | "finished";
  winnerId: string | null;
} {
  const factionUnitCounts = new Map<string, number>();

  for (const unit of gameState.units) {
    const count = factionUnitCounts.get(unit.factionId) || 0;
    factionUnitCounts.set(unit.factionId, count + 1);
  }

  // 3勢力以上が0になった場合、残った勢力が勝者
  const activeFactions = Array.from(factionUnitCounts.entries()).filter(([_, count]) => count > 0);
  if (activeFactions.length === 1) {
    return { status: "finished", winnerId: activeFactions[0]![0]! };
  }

  // すべての相手の拠点を潰したかチェック
  const factionBaseCounts = new Map<string, number>();
  for (const row of gameState.cells) {
    for (const cell of row) {
      if (cell.baseId && cell.baseFactionId) {
        const count = factionBaseCounts.get(cell.baseFactionId) || 0;
        factionBaseCounts.set(cell.baseFactionId, count + 1);
      }
    }
  }

  // 各勢力について、他の勢力の拠点がすべて潰されたかチェック
  for (const faction of gameState.factions) {
    const hasBases = (factionBaseCounts.get(faction.id) || 0) > 0;
    if (!hasBases) {
      // この勢力に拠点がない場合、スキップ
      continue;
    }

    // 他の勢力の拠点がすべて潰されたかチェック
    let allEnemyBasesDestroyed = true;
    for (const otherFaction of gameState.factions) {
      if (otherFaction.id === faction.id) continue;
      const otherBaseCount = factionBaseCounts.get(otherFaction.id) || 0;
      if (otherBaseCount > 0) {
        allEnemyBasesDestroyed = false;
        break;
      }
    }

    if (allEnemyBasesDestroyed) {
      return { status: "finished", winnerId: faction.id };
    }
  }

  // 500tick経過
  if (gameState.tick >= MAX_TICKS) {
    // 占有率が高い勢力が勝者
    // 山・水以外のコマ数を計算
    const totalPassableCells = gameState.cells.flat().filter(
      (cell) => cell.terrain !== "mountain" && cell.terrain !== "water"
    ).length;

    let maxOccupationRate = 0;
    let winnerId: string | null = null;

    for (const faction of gameState.factions) {
      const territory = gameState.cells.flat().filter(
        (cell) => cell.ownerFactionId === faction.id
      ).length;
      const occupationRate = totalPassableCells > 0 
        ? (territory / totalPassableCells) * 100 
        : 0;

      if (occupationRate > maxOccupationRate) {
        maxOccupationRate = occupationRate;
        winnerId = faction.id;
      } else if (occupationRate === maxOccupationRate && maxOccupationRate > 0) {
        winnerId = null; // 同率の場合は引き分け
      }
    }

    return { status: "finished", winnerId };
  }

  return { status: "playing", winnerId: null };
}

