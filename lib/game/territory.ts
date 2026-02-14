// 領地関連のロジック

import { BOARD_SIZE } from "./constants";
import { getAdjacentEmptyCells, getRandomSex, getRandomTrait, randomInt } from "./utils";
import type { Cell, GameState, Unit } from "./types";

/**
 * 3×3以上の連続した領地を検出
 */
export function findTerritoryClusters(
  cells: Cell[][],
  factionId: string,
): Array<Array<{ x: number; y: number }>> {
  const visited = new Set<string>();
  const clusters: Array<Array<{ x: number; y: number }>> = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const cell = cells[y]?.[x];
      if (!cell || cell.ownerFactionId !== factionId) continue;

      // BFSで連続した領地を探索
      const cluster: Array<{ x: number; y: number }> = [];
      const queue: Array<{ x: number; y: number }> = [{ x, y }];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentKey = `${current.x},${current.y}`;

        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        const currentCell = cells[current.y]?.[current.x];
        if (!currentCell || currentCell.ownerFactionId !== factionId) continue;

        cluster.push(current);

        // 上下左右をチェック
        const directions = [
          { x: 0, y: -1 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
        ];

        for (const dir of directions) {
          const nextX = current.x + dir.x;
          const nextY = current.y + dir.y;
          const nextKey = `${nextX},${nextY}`;

          if (
            nextX >= 0 &&
            nextX < BOARD_SIZE &&
            nextY >= 0 &&
            nextY < BOARD_SIZE &&
            !visited.has(nextKey)
          ) {
            const nextCell = cells[nextY]?.[nextX];
            if (nextCell?.ownerFactionId === factionId) {
              queue.push({ x: nextX, y: nextY });
            }
          }
        }
      }

      // 9マス以上（3×3以上）のクラスターのみ追加
      if (cluster.length >= 9) {
        clusters.push(cluster);
      }
    }
  }

  return clusters;
}

/**
 * 領地から新しいコマを生成
 */
export function spawnUnitsFromTerritory(
  gameState: GameState,
): { units: Unit[]; cells: Cell[][] } {
  const newUnits = [...gameState.units];
  const newCells = gameState.cells.map((row) => row.map((cell) => ({ ...cell })));

  // 各勢力の領地クラスターを検出
  for (const faction of gameState.factions) {
    const clusters = findTerritoryClusters(newCells, faction.id);

    for (const cluster of clusters) {
      // 10%の確率で新しいコマを生成
      if (Math.random() < 0.1 && newUnits.length < 300) {
        // クラスター内の空きマスを探す
        const emptyCells: Array<{ x: number; y: number }> = [];

        for (const pos of cluster) {
          const cell = newCells[pos.y]?.[pos.x];
          if (cell && cell.unitId === null) {
            emptyCells.push(pos);
          }
        }

        if (emptyCells.length > 0) {
          // ランダムに空きマスを選択
          const spawnCell =
            emptyCells[Math.floor(Math.random() * emptyCells.length)]!;

          // 新しいコマを生成
          const sex = getRandomSex();
          const newUnit: Unit = {
            id: `unit-${Date.now()}-${Math.random()}`,
            factionId: faction.id,
            x: spawnCell.x,
            y: spawnCell.y,
            sex,
            value: randomInt(10, 15), // 10-15のランダムなvalue
            isHero: false,
            age: 0,
            trait: getRandomTrait(sex),
          };

          newUnits.push(newUnit);
          newCells[spawnCell.y]![spawnCell.x]!.unitId = newUnit.id;
        }
      }
    }
  }

  return { units: newUnits, cells: newCells };
}

