"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { GameBoard } from "@/components/GameBoard";
import type { GameState } from "@/lib/game/types";

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const utils = trpc.useUtils();
  const createGame = trpc.game.create.useMutation({
    onSuccess: (data) => {
      console.log("Game created:", data);
      setGameId(data.id);
      setIsRunning(false);
      // ゲーム状態を取得（gameIdが設定されれば自動的にクエリが実行される）
    },
    onError: (error) => {
      console.error("Failed to create game:", error);
      alert(`ゲーム作成に失敗しました: ${error.message}`);
    },
  });
  const getState = trpc.game.getState.useQuery(
    { gameId: gameId! },
    { 
      enabled: !!gameId, 
      refetchInterval: isRunning ? 500 : false, // 100msから500msに変更
      onError: (error) => {
        console.error("Failed to get game state:", error);
      },
    },
  );
  const executeTick = trpc.game.executeTick.useMutation({
    onError: (error) => {
      console.error("Failed to execute tick:", error);
    },
  });
  const resetGame = trpc.game.reset.useMutation({
    onSuccess: (data) => {
      console.log("Game reset:", data);
      setIsRunning(false);
    },
    onError: (error) => {
      console.error("Failed to reset game:", error);
    },
  });

  const gameState: GameState | null = getState.data || null;

  const handleCreateGame = async () => {
    try {
      await createGame.mutateAsync();
    } catch (error) {
      // エラーはonErrorで処理される
    }
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
    try {
      const newGame = await resetGame.mutateAsync({ gameId });
      setIsRunning(false);
      // ゲーム状態を再取得
      await getState.refetch();
    } catch (error) {
      console.error("Reset failed:", error);
    }
  };

  // 自動tick実行（500ms間隔に変更）
  useEffect(() => {
    if (!isRunning || !gameId || gameState?.status === "finished") return;

    const interval = setInterval(async () => {
      await executeTick.mutateAsync({ gameId });
    }, 500); // 100msから500msに変更

    return () => clearInterval(interval);
  }, [isRunning, gameId, executeTick, gameState?.status]);

  // 各勢力の詳細情報を取得
  const getFactionStats = (factionId: string) => {
    if (!gameState) return null;
    const units = gameState.units.filter((u) => u.factionId === factionId);
    const territory = gameState.cells.flat().filter(
      (cell) => cell.ownerFactionId === factionId
    ).length;
    const heroes = units.filter((u) => u.isHero).length;
    const inCombat = units.filter((u) => u.inCombat).length;
    const totalValue = units.reduce((sum, u) => sum + u.value, 0);
    
    return {
      units: units.length,
      territory,
      heroes,
      inCombat,
      totalValue,
      avgValue: units.length > 0 ? Math.round(totalValue / units.length) : 0,
    };
  };

  const factionA = getFactionStats("faction-a");
  const factionB = getFactionStats("faction-b");
  const factionC = getFactionStats("faction-c");
  const factionD = getFactionStats("faction-d");

  return (
    <main className="flex min-h-screen flex-col p-4">
      {/* 画面上部: ボタンのみ */}
      <div className="flex gap-4 justify-center mb-4 flex-wrap">
        {!gameId ? (
          <button
            onClick={handleCreateGame}
            disabled={createGame.isPending}
            className="retro-button"
          >
            {createGame.isPending ? "作成中..." : "ゲーム開始"}
          </button>
        ) : (
          <>
            {!isRunning ? (
              <>
                <button
                  onClick={handleStart}
                  className="retro-button"
                >
                  開始
                </button>
                <button
                  onClick={handleStep}
                  disabled={executeTick.isPending || gameState?.status === "finished"}
                  className="retro-button"
                >
                  {executeTick.isPending ? "実行中..." : "1ステップ実行"}
                </button>
              </>
            ) : (
              <button
                onClick={handleStop}
                className="retro-button"
              >
                停止
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={resetGame.isPending}
              className="retro-button"
            >
              {resetGame.isPending ? "リセット中..." : "リセット"}
            </button>
            {gameState && (
              <div className="text-green-400 retro-panel flex items-center px-4">
                経過日数: <span className="font-bold ml-2">{gameState.tick}</span>日
                {gameState.status === "finished" && (
                  <span className="ml-4 text-green-500 font-bold">
                    {gameState.winnerId === "faction-a"
                      ? "勢力A（青）の勝利！"
                      : gameState.winnerId === "faction-b"
                        ? "勢力B（赤）の勝利！"
                        : gameState.winnerId === "faction-c"
                          ? "勢力C（緑）の勝利！"
                          : gameState.winnerId === "faction-d"
                            ? "勢力D（オレンジ）の勝利！"
                            : "引き分け"}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Canvasと勢力詳細のレイアウト */}
      <div className="flex justify-center items-start gap-4">
        {/* 左側: 青（上）と緑（下） */}
        <div className="flex flex-col gap-4">
          {/* 青（勢力A） */}
          {factionA && (
            <div className="retro-panel min-w-[200px]">
              <div className="text-blue-400 font-bold mb-2">勢力A（青）</div>
              <div className="text-green-400 text-sm space-y-1">
                <div>コマ数: <span className="font-bold">{factionA.units}</span>体</div>
                <div>領地: <span className="font-bold">{factionA.territory}</span>マス</div>
                <div>英雄: <span className="font-bold">{factionA.heroes}</span>体</div>
                <div>戦闘中: <span className="font-bold text-red-400">{factionA.inCombat}</span>体</div>
                <div>平均Value: <span className="font-bold">{factionA.avgValue}</span></div>
              </div>
            </div>
          )}
          
          {/* 緑（勢力C） */}
          {factionC && (
            <div className="retro-panel min-w-[200px]">
              <div className="text-green-500 font-bold mb-2">勢力C（緑）</div>
              <div className="text-green-400 text-sm space-y-1">
                <div>コマ数: <span className="font-bold">{factionC.units}</span>体</div>
                <div>領地: <span className="font-bold">{factionC.territory}</span>マス</div>
                <div>英雄: <span className="font-bold">{factionC.heroes}</span>体</div>
                <div>戦闘中: <span className="font-bold text-red-400">{factionC.inCombat}</span>体</div>
                <div>平均Value: <span className="font-bold">{factionC.avgValue}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div suppressHydrationWarning>
          <GameBoard gameState={gameState} cellSize={20} />
        </div>

        {/* 右側: 赤（上）と黄色（下） */}
        <div className="flex flex-col gap-4">
          {/* 赤（勢力B） */}
          {factionB && (
            <div className="retro-panel min-w-[200px]">
              <div className="text-red-400 font-bold mb-2">勢力B（赤）</div>
              <div className="text-green-400 text-sm space-y-1">
                <div>コマ数: <span className="font-bold">{factionB.units}</span>体</div>
                <div>領地: <span className="font-bold">{factionB.territory}</span>マス</div>
                <div>英雄: <span className="font-bold">{factionB.heroes}</span>体</div>
                <div>戦闘中: <span className="font-bold text-red-400">{factionB.inCombat}</span>体</div>
                <div>平均Value: <span className="font-bold">{factionB.avgValue}</span></div>
              </div>
            </div>
          )}
          
          {/* 黄色（勢力D） */}
          {factionD && (
            <div className="retro-panel min-w-[200px]">
              <div className="text-orange-400 font-bold mb-2">勢力D（オレンジ）</div>
              <div className="text-green-400 text-sm space-y-1">
                <div>コマ数: <span className="font-bold">{factionD.units}</span>体</div>
                <div>領地: <span className="font-bold">{factionD.territory}</span>マス</div>
                <div>英雄: <span className="font-bold">{factionD.heroes}</span>体</div>
                <div>戦闘中: <span className="font-bold text-red-400">{factionD.inCombat}</span>体</div>
                <div>平均Value: <span className="font-bold">{factionD.avgValue}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
