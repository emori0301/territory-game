"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { GameBoard } from "@/components/GameBoard";
import type { GameState } from "@/lib/game/types";

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const createGame = trpc.game.create.useMutation();
  const getState = trpc.game.getState.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId, refetchInterval: isRunning ? 100 : false },
  );
  const executeTick = trpc.game.executeTick.useMutation();
  const resetGame = trpc.game.reset.useMutation();

  const handleCreateGame = async () => {
    const newGame = await createGame.mutateAsync();
    setGameId(newGame.id);
    setIsRunning(false);
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleStep = async () => {
    if (!gameId) return;
    await executeTick.mutateAsync({ gameId });
  };

  const handleReset = async () => {
    if (!gameId) return;
    const newGame = await resetGame.mutateAsync({ gameId });
    setIsRunning(false);
  };

  // 自動tick実行
  useEffect(() => {
    if (!isRunning || !gameId || gameState?.status === "finished") return;

    const interval = setInterval(async () => {
      await executeTick.mutateAsync({ gameId });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, gameId, executeTick, gameState?.status]);

  const gameState: GameState | null = getState.data || null;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">
          陣地トリゲーム
        </h1>

        <div className="mb-6 flex gap-4 justify-center flex-wrap">
          {!gameId ? (
            <button
              onClick={handleCreateGame}
              disabled={createGame.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {createGame.isPending ? "作成中..." : "ゲーム開始"}
            </button>
          ) : (
            <>
              {!isRunning ? (
                <>
                  <button
                    onClick={handleStart}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    開始
                  </button>
                  <button
                    onClick={handleStep}
                    disabled={executeTick.isPending || gameState?.status === "finished"}
                    className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {executeTick.isPending ? "実行中..." : "1ステップ実行"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  停止
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={resetGame.isPending}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {resetGame.isPending ? "リセット中..." : "リセット"}
              </button>
            </>
          )}
        </div>

        {gameState && (
          <div className="mb-4 text-center">
            <div className="flex gap-6 justify-center flex-wrap">
              <div>
                <span className="text-blue-400">勢力A: </span>
                <span className="font-bold">
                  {gameState.units.filter((u) => u.factionId === "faction-a")
                    .length}
                </span>
                体
              </div>
              <div>
                <span className="text-red-400">勢力B: </span>
                <span className="font-bold">
                  {gameState.units.filter((u) => u.factionId === "faction-b")
                    .length}
                </span>
                体
              </div>
              <div>
                Tick: <span className="font-bold">{gameState.tick}</span> / 500
              </div>
              {gameState.status === "finished" && (
                <div className="text-yellow-400 font-bold">
                  {gameState.winnerId === "faction-a"
                    ? "勢力Aの勝利！"
                    : gameState.winnerId === "faction-b"
                      ? "勢力Bの勝利！"
                      : "引き分け"}
                </div>
              )}
            </div>
          </div>
        )}

        <GameBoard gameState={gameState} cellSize={20} />

        {gameState && (
          <div className="mt-4 text-sm text-gray-400 text-center">
            <p>英雄: ★マーク | 青: 勢力A | 赤: 勢力B</p>
            <p>数字はコマのvalue（強さ・寿命）</p>
          </div>
        )}
      </div>
    </main>
  );
}
