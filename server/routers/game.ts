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
          terrain: cell.terrain || "plain",
          baseId: cell.baseId ?? null,
          baseFactionId: cell.baseFactionId ?? null,
          baseCreatedTick: cell.baseCreatedTick ?? null,
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
        trait: unit.trait,
        inCombat: unit.inCombat || false,
      })),
      factions: gameState.factions.map((faction) => ({
        id: faction.id,
        name: faction.name,
      })),
      boardSize: gameState.boardSize || 30,
      playerFactionId: gameState.playerFactionId ?? null,
      userCommands: gameState.userCommands || [],
    };
  } catch (error) {
    console.error("Error serializing game state:", error);
    console.error("GameState:", JSON.stringify(gameState, null, 2));
    throw error;
  }
}

export const gameRouter = createTRPCRouter({
  // 新しいゲームを作成
  create: publicProcedure
    .input(z.object({ 
      boardSize: z.number().min(10).max(50).optional().default(30),
      factionCount: z.number().min(2).max(4).optional().default(4),
    }).optional())
    .mutation(({ input }) => {
      try {
        const boardSize = input?.boardSize || 30;
        const factionCount = input?.factionCount || 4;
        console.log("Creating new game with board size:", boardSize, "faction count:", factionCount);
        const gameState = createNewGame(boardSize, factionCount);
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
    .input(z.object({ 
      gameId: z.string(),
      boardSize: z.number().min(10).max(50).optional().default(30),
    }))
    .mutation(({ input }) => {
      try {
        const boardSize = input.boardSize || 30;
        // 既存のゲームを削除して新しいゲームを作成
        const newGameState = createNewGame(boardSize);
        // 既存のgameIdを保持して新しいゲームを作成
        const resetGameState = {
          ...newGameState,
          id: input.gameId, // 既存のgameIdを保持
        };
        gameStore.set(input.gameId, resetGameState);
        return serializeGameState(resetGameState);
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

  // プレイヤー勢力を設定
  setPlayerFaction: publicProcedure
    .input(z.object({ 
      gameId: z.string(),
      factionId: z.string(),
    }))
    .mutation(({ input }) => {
      const gameState = gameStore.get(input.gameId);
      if (!gameState) {
        throw new Error("Game not found");
      }
      gameState.playerFactionId = input.factionId;
      gameStore.set(input.gameId, gameState);
      return serializeGameState(gameState);
    }),

  // ユーザー命令を追加
  addUserCommand: publicProcedure
    .input(z.object({ 
      gameId: z.string(),
      unitId: z.string(),
      type: z.enum(["move", "attack", "createBase"]),
      targetX: z.number().optional(),
      targetY: z.number().optional(),
      targetUnitId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const gameState = gameStore.get(input.gameId);
      if (!gameState) {
        throw new Error("Game not found");
      }
      
      // 既存の命令を削除（同じコマへの命令は上書き）
      gameState.userCommands = (gameState.userCommands || []).filter(
        cmd => cmd.unitId !== input.unitId
      );
      
      // 新しい命令を追加
      gameState.userCommands.push({
        unitId: input.unitId,
        type: input.type,
        targetX: input.targetX,
        targetY: input.targetY,
        targetUnitId: input.targetUnitId,
      });
      
      gameStore.set(input.gameId, gameState);
      return serializeGameState(gameState);
    }),
});

