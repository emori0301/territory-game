// ゲーム関連のtRPCルーター

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { createNewGame, executeTick } from "@/lib/game/tick";
import type { GameState } from "@/lib/game/types";

// メモリ上でゲーム状態を保持（本番環境ではデータベースを使用）
const gameStore = new Map<string, GameState>();

export const gameRouter = createTRPCRouter({
  // 新しいゲームを作成
  create: publicProcedure.mutation(() => {
    const gameState = createNewGame();
    gameStore.set(gameState.id, gameState);
    return gameState;
  }),

  // ゲーム状態を取得
  getState: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(({ input }) => {
      const gameState = gameStore.get(input.gameId);
      if (!gameState) {
        throw new Error("Game not found");
      }
      return gameState;
    }),

  // Tickを実行
  executeTick: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input }) => {
      const gameState = gameStore.get(input.gameId);
      if (!gameState) {
        throw new Error("Game not found");
      }

      const newState = executeTick(gameState);
      gameStore.set(input.gameId, newState);
      return newState;
    }),

  // ゲームをリセット
  reset: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(({ input }) => {
      const gameState = createNewGame();
      gameStore.set(input.gameId, gameState);
      return gameState;
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

