"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/react";
import { GameBoard } from "@/components/GameBoard";
import type { GameState, Cell, Unit } from "@/lib/game/types";
import { Play, Pause, StepForward, RotateCcw, Home as HomeIcon } from "lucide-react";

type ViewMode = "title" | "game" | "settings";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("title");
  const [gameId, setGameId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [playerFactionId, setPlayerFactionId] = useState<string | null>(null);
  const [gameSpeed, setGameSpeed] = useState(1); // 1 = 通常速度
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{ cell: any; unit: any; x: number; y: number } | null>(null);
  const [hasStarted, setHasStarted] = useState(false); // ゲームが開始されたかどうか
  
  // 設定（localStorageから読み込み）
  const [cellSize, setCellSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cellSize");
      return saved ? Number(saved) : 20;
    }
    return 20;
  });
  const [boardSize, setBoardSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("boardSize");
      return saved ? Number(saved) : 30;
    }
    return 30;
  });
  const [factionCount, setFactionCount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("factionCount");
      return saved ? Number(saved) : 4;
    }
    return 4;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("musicVolume");
      return saved ? Number(saved) : 50;
    }
    return 50;
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("musicEnabled");
      return saved ? saved === "true" : true;
    }
    return true;
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  
  // 設定画面用の一時的なstate
  const [tempCellSize, setTempCellSize] = useState(cellSize);
  const [tempBoardSize, setTempBoardSize] = useState(boardSize);
  const [tempFactionCount, setTempFactionCount] = useState(factionCount);
  const [tempMusicVolume, setTempMusicVolume] = useState(musicVolume);
  const [tempMusicEnabled, setTempMusicEnabled] = useState(musicEnabled);
  
  // 設定画面を開いたときに現在の設定値を一時的なstateにコピー
  useEffect(() => {
    if (viewMode === "settings") {
      setTempCellSize(cellSize);
      setTempBoardSize(boardSize);
      setTempFactionCount(factionCount);
      setTempMusicVolume(musicVolume);
      setTempMusicEnabled(musicEnabled);
    }
  }, [viewMode, cellSize, boardSize, factionCount, musicVolume, musicEnabled]);
  
  // 設定変更時にlocalStorageに保存（ゲーム画面でのみ）
  useEffect(() => {
    if (viewMode === "game" && typeof window !== "undefined") {
      localStorage.setItem("cellSize", cellSize.toString());
      localStorage.setItem("boardSize", boardSize.toString());
      localStorage.setItem("factionCount", factionCount.toString());
      localStorage.setItem("musicVolume", musicVolume.toString());
      localStorage.setItem("musicEnabled", musicEnabled.toString());
    }
  }, [viewMode, cellSize, boardSize, factionCount, musicVolume, musicEnabled]);

  const utils = trpc.useUtils();
  const createGame = trpc.game.create.useMutation({
    onSuccess: (data) => {
      console.log("Game created:", data);
      setGameId(data.id);
      setIsRunning(false);
      setViewMode("game");
      setPlayerFactionId(null); // リセット
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
      refetchInterval: isRunning ? 500 : false,
    },
  );
  const executeTick = trpc.game.executeTick.useMutation({
    onError: (error) => {
      console.error("Failed to execute tick:", error);
    },
  });
  const setPlayerFaction = trpc.game.setPlayerFaction.useMutation({
    onSuccess: () => {
      getState.refetch();
    },
  });
  const addUserCommand = trpc.game.addUserCommand.useMutation({
    onSuccess: () => {
      getState.refetch();
    },
  });
  const resetGame = trpc.game.reset.useMutation({
    onSuccess: (data) => {
      console.log("Game reset:", data);
      setGameId(data.id); // リセット後のgameIdを設定
      setIsRunning(false);
    },
    onError: (error) => {
      console.error("Failed to reset game:", error);
    },
  });

  const gameState: GameState | null = getState.data || null;

  // ユーザーインタラクションを検出（音楽再生のため）
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
    };
    
    // ページロード時に一度だけイベントリスナーを追加
    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });
    window.addEventListener("touchstart", handleUserInteraction, { once: true });
    
    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  // 音楽の設定
  useEffect(() => {
    if (musicEnabled && viewMode === "game" && gameId && userInteracted) {
      // 音楽ファイルを読み込む
      const musicFile = "/music/rpg-bgm.mp3";
      
      if (!audioRef.current) {
        audioRef.current = new Audio(musicFile);
        audioRef.current.loop = true;
        audioRef.current.volume = musicVolume / 100;
        audioRef.current.preload = "auto";
        
        // エラーハンドリング
        audioRef.current.addEventListener("error", (e) => {
          console.warn("音楽ファイルの読み込みに失敗しました。音楽ファイルが存在しない可能性があります。");
          console.warn("音楽ファイルを /public/music/rpg-bgm.mp3 に配置してください。");
          console.warn("現在のaudio要素の状態:", audioRef.current?.readyState);
          console.warn("エラー詳細:", e);
        });
        
        // 読み込み完了時の処理
        audioRef.current.addEventListener("canplaythrough", () => {
          console.log("音楽ファイルの読み込みが完了しました");
          // 読み込み完了後に再生を試みる
          if (userInteracted && musicEnabled && viewMode === "game") {
            audioRef.current?.play().catch((error) => {
              console.warn("音楽の再生に失敗しました:", error);
            });
          }
        });
        
        // 読み込み開始時の処理
        audioRef.current.addEventListener("loadstart", () => {
          console.log("音楽ファイルの読み込みを開始しました");
        });
      }
      
      if (audioRef.current) {
        audioRef.current.volume = musicVolume / 100;
        
        // 音楽を再生（ユーザーが操作した後）
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("音楽の再生を開始しました");
            })
            .catch((error) => {
              // 音楽ファイルが存在しない場合や自動再生がブロックされた場合
              console.warn("音楽の再生に失敗しました:", error);
              console.warn("エラー名:", error.name);
              console.warn("エラーメッセージ:", error.message);
            });
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      // クリーンアップ時は何もしない（音楽を継続させる）
    };
  }, [musicEnabled, musicVolume, viewMode, gameId, userInteracted]);

  const handleCreateGame = async () => {
    try {
      // ユーザーが操作したことを記録（音楽再生のため）
      setUserInteracted(true);
      setHasStarted(false); // 新しいゲーム作成時はリセット
      await createGame.mutateAsync({
        boardSize,
        factionCount,
      });
    } catch (error) {
      // エラーはonErrorで処理される
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    setHasStarted(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleStep = async () => {
    if (!gameId) {
      console.error("Game ID is not set");
      return;
    }
    try {
      setHasStarted(true); // ステップ実行時も開始済みとみなす
      await executeTick.mutateAsync({ gameId });
    } catch (error) {
      console.error("Failed to execute step:", error);
      // ゲームが見つからない場合は、ゲームを再作成
      if (error instanceof Error && error.message.includes("Game not found")) {
        console.log("Game not found, creating new game...");
        await handleCreateGame();
      }
    }
  };

  const handleReset = async () => {
    if (!gameId) return;
    try {
      const newGame = await resetGame.mutateAsync({ gameId });
      setIsRunning(false);
      setHasStarted(false); // リセット時も開始状態をリセット
      await getState.refetch();
    } catch (error) {
      console.error("Reset failed:", error);
    }
  };

  const handleBackToTitle = () => {
    setIsRunning(false);
    setGameId(null);
    setViewMode("title");
    setPlayerFactionId(null);
    setSelectedUnitIds(new Set());
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleSetPlayerFaction = async (factionId: string) => {
    if (!gameId) return;
    try {
      await setPlayerFaction.mutateAsync({ gameId, factionId });
      setPlayerFactionId(factionId);
    } catch (error) {
      console.error("Failed to set player faction:", error);
    }
  };

  // コマクリックハンドラー
  const handleUnitClick = (unitId: string, x: number, y: number) => {
    if (!gameState || !playerFactionId) return;
    
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || unit.factionId !== playerFactionId) return;
    
    // 選択状態をトグル
    const newSelected = new Set(selectedUnitIds);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnitIds(newSelected);
  };
  
  // セルクリックハンドラー（移動指示）
  const handleCellClick = async (x: number, y: number) => {
    if (!gameId || !gameState || selectedUnitIds.size === 0) return;
    
    const cell = gameState.cells[y]?.[x];
    const targetUnit = gameState.units.find(u => u.x === x && u.y === y);
    
    // 敵コマがいる場合は攻撃指示
    if (targetUnit && playerFactionId && targetUnit.factionId !== playerFactionId) {
      for (const unitId of selectedUnitIds) {
        try {
          await addUserCommand.mutateAsync({
            gameId,
            unitId,
            type: "attack",
            targetUnitId: targetUnit.id,
          });
        } catch (error) {
          console.error("Failed to add attack command:", error);
        }
      }
      setSelectedUnitIds(new Set()); // 選択をクリア
      return;
    }
    
    // 拠点がある場合も移動指示（拠点の色塗り替え）
    // 移動指示
    for (const unitId of selectedUnitIds) {
      try {
        await addUserCommand.mutateAsync({
          gameId,
          unitId,
          type: "move",
          targetX: x,
          targetY: y,
        });
      } catch (error) {
        console.error("Failed to add move command:", error);
      }
    }
    setSelectedUnitIds(new Set()); // 選択をクリア
  };

  // 自動tick実行（ゲーム速度に応じて間隔を変更）
  useEffect(() => {
    if (!isRunning || !gameId || gameState?.status === "finished") return;

    // ゲーム速度に応じて間隔を変更（1 = 600ms, 2 = 300ms, 0.5 = 1200ms）
    const baseInterval = 600; // 1.00xの速度を少し遅くする
    const interval = baseInterval / gameSpeed;

    const intervalId = setInterval(async () => {
      if (!gameId) {
        console.error("Game ID is not set in interval");
        return;
      }
      try {
        await executeTick.mutateAsync({ gameId });
      } catch (error) {
        console.error("Failed to execute tick in interval:", error);
        // ゲームが見つからない場合は停止
        if (error instanceof Error && error.message.includes("Game not found")) {
          console.log("Game not found, stopping auto-tick");
          setIsRunning(false);
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [isRunning, gameId, executeTick, gameState?.status, gameSpeed]);

  // 地形名を日本語で取得
  const getTerrainName = (terrain: string): string => {
    switch (terrain) {
      case "plain":
        return "平地";
      case "water":
        return "水";
      case "rock":
        return "岩";
      case "tree":
        return "木";
      case "swamp":
        return "沼地";
      case "mountain":
        return "山";
      default:
        return terrain;
    }
  };
  
  // 勢力名を取得
  const getFactionName = (factionId: string | null, gameState: GameState | null): string => {
    if (!factionId || !gameState) return "なし";
    const faction = gameState.factions.find((f) => f.id === factionId);
    return faction?.name || factionId;
  };
  
  // 特性の日本語名と説明を取得
  const getTraitInfo = (trait: string): { name: string; description: string } => {
    switch (trait) {
      case "craftsman":
        return { name: "職人", description: "塗られていないマス+相手陣地を塗る" };
      case "warrior":
        return { name: "戦士", description: "周囲10マス以内の敵に向かう" };
      case "berserker":
        return { name: "狂戦士", description: "valueが低いほど遠くの敵も攻撃（カオス）" };
      case "wanderer":
        return { name: "放浪者", description: "ランダムに動く（カオス）" };
      case "scout":
        return { name: "斥候", description: "塗られていない土地優先、なければ侵略者と同様" };
      case "invader":
        return { name: "侵略者", description: "相手陣地の塗りを優先" };
      case "builder":
        return { name: "建築家", description: "拠点作成を優先" };
      case "normal":
        return { name: "通常", description: "味方がいなければ塗り、いれば合体" };
      default:
        return { name: trait, description: "" };
    }
  };

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
    
    // 山・水以外のコマ数を計算
    const totalPassableCells = gameState.cells.flat().filter(
      (cell) => cell.terrain !== "mountain" && cell.terrain !== "water"
    ).length;
    const occupationRate = totalPassableCells > 0 
      ? Math.round((territory / totalPassableCells) * 100) 
      : 0;
    
    return {
      units: units.length,
      territory,
      heroes,
      inCombat,
      totalValue,
      avgValue: units.length > 0 ? Math.round(totalValue / units.length) : 0,
      occupationRate,
    };
  };

  // 実際に存在する勢力の統計を取得
  const factionStats = gameState ? gameState.factions.map(f => ({
    faction: f,
    stats: getFactionStats(f.id),
  })).filter(fs => fs.stats !== null) : [];

  // タイトル画面
  if (viewMode === "title") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-8xl font-bold mb-16 retro-title" suppressHydrationWarning>
          MONARCHY
        </h1>
        <div className="flex flex-col gap-6">
          <button
            onClick={() => {
              setUserInteracted(true); // ユーザー操作を記録
              handleCreateGame();
            }}
            disabled={createGame.isPending}
            className="retro-button text-2xl px-12 py-6"
            type="button"
          >
            {createGame.isPending ? "作成中..." : "GAME START"}
          </button>
          <button
            onClick={() => setViewMode("settings")}
            className="retro-button text-2xl px-12 py-6"
            type="button"
          >
            SETTING
          </button>
        </div>
      </main>
    );
  }

  // 設定画面
  if (viewMode === "settings") {
    const handleApplySettings = () => {
      setCellSize(tempCellSize);
      setBoardSize(tempBoardSize);
      setFactionCount(tempFactionCount);
      setMusicVolume(tempMusicVolume);
      setMusicEnabled(tempMusicEnabled);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("cellSize", tempCellSize.toString());
        localStorage.setItem("boardSize", tempBoardSize.toString());
        localStorage.setItem("factionCount", tempFactionCount.toString());
        localStorage.setItem("musicVolume", tempMusicVolume.toString());
        localStorage.setItem("musicEnabled", tempMusicEnabled.toString());
      }
      
      setViewMode("title");
    };

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-6xl font-bold mb-12 retro-title" suppressHydrationWarning>
          SETTING
        </h1>
        <div className="retro-panel min-w-[400px] space-y-6">
          <div>
            <label className="text-green-400 mb-2 block">
              マスの大きさ: {tempCellSize}px
            </label>
            <input
              type="range"
              min="10"
              max="30"
              value={tempCellSize}
              onChange={(e) => setTempCellSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-green-400 mb-2 block">
              マスの数（ボードサイズ）: {tempBoardSize}×{tempBoardSize}
            </label>
            <input
              type="range"
              min="20"
              max="50"
              step="5"
              value={tempBoardSize}
              onChange={(e) => setTempBoardSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-green-400 mb-2 block">
              勢力数: {tempFactionCount}
            </label>
            <input
              type="range"
              min="2"
              max="4"
              value={tempFactionCount}
              onChange={(e) => setTempFactionCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-green-400 mb-2 block">
              音楽音量: {tempMusicVolume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={tempMusicVolume}
              onChange={(e) => setTempMusicVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="musicEnabled"
              checked={tempMusicEnabled}
              onChange={(e) => setTempMusicEnabled(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="musicEnabled" className="text-green-400">
              音楽を有効にする
            </label>
          </div>
          {!tempMusicEnabled && (
            <div className="text-yellow-400 text-sm">
              ※ 音楽ファイルが存在しない場合、エラーが表示されることがありますが、ゲームは正常に動作します。
            </div>
          )}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleApplySettings}
              className="retro-button flex-1"
              type="button"
            >
              決定
            </button>
            <button
              onClick={() => setViewMode("title")}
              className="retro-button flex-1"
              type="button"
            >
              キャンセル
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ゲーム画面
  return (
    <main className="flex min-h-screen flex-col p-4">
      {/* 画面上部: ボタンのみ（アイコン化、高さを低く） */}
      <div className="flex gap-2 justify-center items-center mb-4 w-full flex-wrap">
        <div className="flex gap-2 items-center">
          {!isRunning ? (
            <>
              <button
                onClick={handleStart}
                className="retro-button-icon"
                title="開始"
                type="button"
              >
                <Play size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={handleStep}
                disabled={executeTick.isPending || gameState?.status === "finished"}
                className="retro-button-icon"
                title="1ステップ実行"
                type="button"
              >
                {executeTick.isPending ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <StepForward size={18} strokeWidth={2.5} />
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleStop}
              className="retro-button-icon"
              title="停止"
              type="button"
            >
              <Pause size={18} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetGame.isPending}
            className="retro-button-icon"
            title="リセット"
            type="button"
          >
            {resetGame.isPending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <RotateCcw size={18} strokeWidth={2.5} />
            )}
          </button>
          <button
            onClick={handleBackToTitle}
            className="retro-button-icon"
            title="タイトルに戻る"
            type="button"
          >
            <HomeIcon size={18} strokeWidth={2.5} />
          </button>
        </div>
        {gameState && (
          <div className="text-green-400 retro-panel flex items-center px-4 h-8 whitespace-nowrap ml-2">
            経過日数: <span className="font-bold ml-2">{gameState.tick}</span>日
            {gameState.status === "finished" && (
              <span className="ml-4 text-green-500 font-bold">
                {gameState.winnerId 
                  ? `${gameState.factions.find(f => f.id === gameState.winnerId)?.name || gameState.winnerId}の勝利！`
                  : "引き分け"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Canvasと勢力詳細のレイアウト */}
      <div className="flex justify-center items-start gap-4">
        {/* 左側: 勢力パネル（上から順に） */}
        <div className="flex flex-col gap-4">
          {factionStats.slice(0, Math.ceil(factionStats.length / 2)).map(({ faction, stats }) => {
            if (!stats) return null;
            const colorClass = faction.id === "faction-a" ? "text-blue-400" :
                              faction.id === "faction-b" ? "text-red-400" :
                              faction.id === "faction-c" ? "text-green-500" :
                              "text-orange-400";
            return (
              <div key={faction.id} className={`retro-panel min-w-[200px] ${playerFactionId === faction.id ? "animate-pulse" : ""}`}>
                <div className={`${colorClass} font-bold mb-2`}>{faction.name}</div>
                <div className="text-green-400 text-sm space-y-1">
                  <div>コマ数: <span className="font-bold">{stats.units}</span>体</div>
                  <div>領地: <span className="font-bold">{stats.territory}</span>マス</div>
                  <div>占有度: <span className="font-bold">{stats.occupationRate}</span>%</div>
                  <div>英雄: <span className="font-bold">{stats.heroes}</span>体</div>
                  <div>戦闘中: <span className="font-bold text-red-400">{stats.inCombat}</span>体</div>
                  <div>平均戦力: <span className="font-bold">{stats.avgValue}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Canvas */}
        <div suppressHydrationWarning className="relative">
          <GameBoard 
            gameState={gameState} 
            cellSize={cellSize}
            playerFactionId={playerFactionId}
            selectedUnitIds={selectedUnitIds}
            onUnitClick={handleUnitClick}
            onCellClick={handleCellClick}
            onHoverCell={setHoveredCell}
          />
          
          {/* プレイヤー操作UI（canvasの真ん中） */}
          {!playerFactionId && gameState && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 retro-panel p-4 z-20">
              <div className="text-green-400 text-sm mb-2 font-bold">操作する勢力を選択:</div>
              <div className="flex flex-col gap-2">
                {gameState.factions.map((faction) => (
                  <button
                    key={faction.id}
                    onClick={() => handleSetPlayerFaction(faction.id)}
                    className="bg-black border-2 border-green-500 text-green-400 px-3 py-2 rounded hover:bg-green-900 text-sm text-left"
                    type="button"
                  >
                    {faction.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* 選択中のコマ数表示 */}
          {playerFactionId && selectedUnitIds.size > 0 && (
            <div className="absolute top-4 right-4 retro-panel p-3 z-20">
              <div className="text-yellow-400 text-sm font-bold">
                選択中: {selectedUnitIds.size}体
              </div>
              <div className="text-green-400 text-xs mt-1">
                移動先をクリックで移動<br/>
                敵をクリックで攻撃
              </div>
            </div>
          )}
          
          {/* GAME OVER / GAME CLEAR 表示 */}
          {playerFactionId && gameState && (() => {
            const playerFaction = getFactionStats(playerFactionId);
            // ゲームが開始されてから、かつ占有度が0%になった場合のみGAME OVERを表示
            const isGameOver = hasStarted && playerFaction && playerFaction.occupationRate === 0 && gameState.tick > 0;
            const isGameClear = gameState.status === "finished" && gameState.winnerId === playerFactionId;
            
            if (isGameOver || isGameClear) {
              return (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                  <div className="retro-panel p-8 text-center">
                    <div className={`text-6xl font-bold mb-4 ${isGameOver ? "text-red-500" : "text-yellow-400"}`}>
                      {isGameOver ? "GAME OVER" : "GAME CLEAR"}
                    </div>
                    {isGameClear && (
                      <div className="text-white text-lg">
                        {gameState.factions.find(f => f.id === playerFactionId)?.name || "あなた"}の勝利！
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* 占有度の棒グラフ（canvasの下） */}
          {gameState && (
            <div className="mt-4 retro-panel p-3">
              <div className="text-white text-sm font-bold mb-2">勢力占有度</div>
              <div className="flex items-center gap-1 h-6 bg-gray-800 rounded overflow-hidden">
                {factionStats.map(({ faction, stats }) => {
                  if (!stats) return null;
                  const bgColor = faction.id === "faction-a" ? "bg-blue-500" :
                                 faction.id === "faction-b" ? "bg-red-500" :
                                 faction.id === "faction-c" ? "bg-green-500" :
                                 "bg-orange-500";
                  return (
                    <div
                      key={faction.id}
                      className={`${bgColor} h-full flex items-center justify-center text-xs text-white font-bold`}
                      style={{ width: `${stats.occupationRate}%` }}
                      title={`${faction.name}: ${stats.occupationRate}%`}
                    >
                      {stats.occupationRate > 5 && `${stats.occupationRate}%`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 右側: 勢力パネル（下から順に） */}
        <div className="flex flex-col gap-4">
          {factionStats.slice(Math.ceil(factionStats.length / 2)).map(({ faction, stats }) => {
            if (!stats) return null;
            const colorClass = faction.id === "faction-a" ? "text-blue-400" :
                              faction.id === "faction-b" ? "text-red-400" :
                              faction.id === "faction-c" ? "text-green-500" :
                              "text-orange-400";
            return (
              <div key={faction.id} className={`retro-panel min-w-[200px] ${playerFactionId === faction.id ? "animate-pulse" : ""}`}>
                <div className={`${colorClass} font-bold mb-2`}>{faction.name}</div>
                <div className="text-green-400 text-sm space-y-1">
                  <div>コマ数: <span className="font-bold">{stats.units}</span>体</div>
                  <div>領地: <span className="font-bold">{stats.territory}</span>マス</div>
                  <div>占有度: <span className="font-bold">{stats.occupationRate}</span>%</div>
                  <div>英雄: <span className="font-bold">{stats.heroes}</span>体</div>
                  <div>戦闘中: <span className="font-bold text-red-400">{stats.inCombat}</span>体</div>
                  <div>平均戦力: <span className="font-bold">{stats.avgValue}</span></div>
                </div>
              </div>
            );
          })}
          
          {/* ゲーム速度調整（勢力Dの下、右下） */}
          {gameState && (
            <div className="retro-panel min-w-[200px] p-3">
              <div className="text-green-400 text-sm font-bold mb-2">ゲーム速度</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  value={gameSpeed}
                  onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-green-400 text-sm font-bold min-w-[3rem]">
                  {gameSpeed.toFixed(2)}x
                </span>
              </div>
            </div>
          )}
          
          {/* ホバー情報（ゲーム速度の下） */}
          {hoveredCell && gameState && (
            <div className="retro-panel min-w-[200px] max-w-[200px] p-3">
              <div className="font-bold text-green-500 mb-2 border-b border-green-500 pb-1 text-sm">
                位置: ({hoveredCell.cell.x}, {hoveredCell.cell.y})
              </div>
              
              <div className="mb-2 text-xs">
                <div className="text-green-300">地形: {getTerrainName(hoveredCell.cell.terrain)}</div>
                <div className="text-green-300">領地: {getFactionName(hoveredCell.cell.ownerFactionId, gameState)}</div>
                {hoveredCell.cell.baseId && (
                  <div className="text-yellow-400">🏠 拠点あり ({getFactionName(hoveredCell.cell.baseFactionId, gameState)})</div>
                )}
              </div>
              
              {hoveredCell.unit ? (
                <div className="mt-2 pt-2 border-t border-green-500 text-xs">
                  <div className="font-bold text-green-500">
                    特性: {getTraitInfo(hoveredCell.unit.trait).name}
                  </div>
                  <div className="text-green-300 mb-1 break-words">
                    {getTraitInfo(hoveredCell.unit.trait).description}
                  </div>
                  <div>性別: {hoveredCell.unit.sex === "male" ? "雄" : "雌"}</div>
                  <div>Value: {hoveredCell.unit.value}</div>
                  {hoveredCell.unit.inCombat && <div className="text-red-400">⚔️ 戦闘中</div>}
                  {hoveredCell.unit.isHero && <div className="text-yellow-400">★ 英雄</div>}
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-green-500 text-green-300 text-xs">
                  コマ: なし
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
