// ゲーム関連のtRPCルーター

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { createNewGame } from "@/lib/game/initialization";
import { executeTick } from "@/lib/game/tick";
import type { GameState } from "@/lib/game/types";

// メモリ上でゲーム状態を保持（本番環境ではデータベースを使用）
const gameStore = new Map<string, GameState>();

/**
 * GameStateをシリアライズ可能な形に変換
 */
function serializeGameState(gameState: GameState): GameState {
  try {
    if (!gameState) {
      throw new Error("GameState is null or undefined");
    }
    if (!gameState.cells || !Array.isArray(gameState.cells)) {
      throw new Error("GameState.cells is invalid");
    }
    if (!gameState.units || !Array.isArray(gameState.units)) {
      throw new Error("GameState.units is invalid");
    }
    if (!gameState.factions || !Array.isArray(gameState.factions)) {
      throw new Error("GameState.factions is invalid");
    }

    return {
      ...gameState,
      cells: gameState.cells.map((row) =>
        row.map((cell) => ({
          x: cell.x,
          y: cell.y,
          ownerFactionId: cell.ownerFactionId,
          unitId: cell.unitId,
        })),
      ),
      units: gameState.units.map((unit) => ({
        id: unit.id,
        factionId: unit.factionId,
        x: unit.x,
        y: unit.y,
        sex: unit.sex,
        value: unit.value,
        isHero: unit.isHero,
        age: unit.age,
      })),
      factions: gameState.factions.map((faction) => ({
        id: faction.id,
        name: faction.name,
      })),
    };
  } catch (error) {
    console.error("Error serializing game state:", error);
    console.error("GameState:", JSON.stringify(gameState, null, 2));
    throw error;
  }
}

export const gameRouter = createTRPCRouter({
  // 新しいゲームを作成
  create: publicProcedure.mutation(() => {
    try {
      console.log("Creating new game...");
      const gameState = createNewGame();
      console.log("Game created:", gameState.id, "Units:", gameState.units.length);
      gameStore.set(gameState.id, gameState);
      const serialized = serializeGameState(gameState);
      console.log("Game serialized successfully");
      return serialized;
    } catch (error) {
      console.error("Error creating game:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      throw new Error(`Failed to create game: ${error instanceof Error ? error.message : String(error)}`);
    }
  }),

  // ゲーム状態を取得
  getState: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(({ input }) => {
      const gameState = gameStore.get(input.gameId);
      if (!gameState) {
        throw new Error("Game not found");
      }
      return serializeGameState(gameState);
    }),

  // Tickを実行
  executeTick: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input }) => {
      try {
        const gameState = gameStore.get(input.gameId);
        if (!gameState) {
          throw new Error("Game not found");
        }

        const newState = executeTick(gameState);
        gameStore.set(input.gameId, newState);
        return serializeGameState(newState);
      } catch (error) {
        console.error("Error executing tick:", error);
        throw new Error(`Failed to execute tick: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // ゲームをリセット
  reset: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input }) => {
      try {
        // 既存のゲームを削除して新しいゲームを作成
        const newGameState = createNewGame();
        // 同じgameIdで新しいゲームを作成
        gameStore.set(input.gameId, newGameState);
        return serializeGameState(newGameState);
      } catch (error) {
        console.error("Error resetting game:", error);
        throw new Error(`Failed to reset game: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // 全ゲーム一覧を取得
  list: publicProcedure.query(() => {
    return Array.from(gameStore.values()).map((game) => ({
      id: game.id,
      status: game.status,
      tick: game.tick,
      winnerId: game.winnerId,
      unitCount: game.units.length,
    }));
  }),
});

