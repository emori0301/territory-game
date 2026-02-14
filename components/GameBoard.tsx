"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import type { GameState, UnitTrait, TerrainType } from "@/lib/game/types";

interface GameBoardProps {
  gameState: GameState | null;
  cellSize?: number;
}

export function GameBoard({ gameState, cellSize = 15 }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredUnit, setHoveredUnit] = useState<{ unit: any; x: number; y: number } | null>(null);
  
  // クライアント側でのみマウントされるようにする
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 地形画像を読み込み
  const terrainImages = useRef<Record<TerrainType, HTMLImageElement | null>>({
    plain: null,
    water: null,
    rock: null,
    tree: null,
    swamp: null,
    mountain: null,
  });
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // フリー素材の画像URL（実際の画像に置き換える必要があります）
    const imageUrls: Record<TerrainType, string> = {
      plain: "/images/terrain/grass.png",
      water: "/images/terrain/water.png",
      rock: "/images/terrain/rock.png",
      tree: "/images/terrain/tree.png",
      swamp: "/images/terrain/swamp.png",
      mountain: "/images/terrain/mountain.png",
    };
    
    // 画像を読み込み
    Object.keys(imageUrls).forEach((terrain) => {
      const img = new Image();
      img.onerror = () => {
        // 画像が存在しない場合はnullのまま（フォールバックを使用）
        terrainImages.current[terrain as TerrainType] = null;
      };
      img.src = imageUrls[terrain as TerrainType];
      terrainImages.current[terrain as TerrainType] = img;
    });
  }, []);
  
  // 地形画像を取得する関数
  const getTerrainImage = (terrain: TerrainType): HTMLImageElement | null => {
    return terrainImages.current[terrain] || null;
  };
  
  // フォールバック描画（画像がない場合）
  const drawTerrainFallback = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    terrain: TerrainType,
  ) => {
    switch (terrain) {
      case "water":
        ctx.fillStyle = "rgba(33, 150, 243, 0.7)"; // 青（水、半透明）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#1976D2";
        ctx.font = `${Math.floor(size * 0.4)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("~", x + size / 2, y + size / 2);
        break;
      case "rock":
        // 岩は緑背景の上に半透明で描画（違和感なく）
        ctx.fillStyle = "rgba(117, 117, 117, 0.5)"; // グレー（半透明）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#424242";
        ctx.font = `${Math.floor(size * 0.3)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("■", x + size / 2, y + size / 2);
        break;
      case "tree":
        ctx.fillStyle = "rgba(76, 175, 80, 0.8)"; // 緑（木、半透明）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#2E7D32";
        ctx.font = `${Math.floor(size * 0.4)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♠", x + size / 2, y + size / 2);
        break;
      case "swamp":
        ctx.fillStyle = "rgba(121, 85, 72, 0.7)"; // 茶色（沼地、半透明）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#5D4037";
        ctx.font = `${Math.floor(size * 0.3)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("≈", x + size / 2, y + size / 2);
        break;
      case "mountain":
        ctx.fillStyle = "rgba(158, 158, 158, 0.7)"; // ライトグレー（山、半透明）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#616161";
        ctx.font = `${Math.floor(size * 0.3)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("▲", x + size / 2, y + size / 2);
        break;
      case "plain":
      default:
        // 平地は何も描画しない（背景のみ）
        break;
    }
  };
  
  // 特性の日本語名と説明を取得
  const getTraitInfo = (trait: UnitTrait): { name: string; description: string } => {
    switch (trait) {
      case "painter":
        return { name: "塗り職人", description: "塗られていないマスを優先" };
      case "aggressive":
        return { name: "攻撃的", description: "周囲5マス以内の敵に向かう" };
      case "berserker":
        return { name: "狂戦士", description: "valueが低いほど遠くの敵も攻撃（カオス）" };
      case "wanderer":
        return { name: "放浪者", description: "完全にランダムに動く（カオス）" };
      case "kamikaze":
        return { name: "特攻", description: "valueが低いと突進、高いと逃走（カオス）" };
      case "scout":
        return { name: "斥候", description: "遠くの敵を探して移動（カオス）" };
      case "normal":
        return { name: "通常", description: "バランス型の行動" };
      default:
        return { name: trait, description: "" };
    }
  };
  
  // マウス移動イベントハンドラー
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current || !isMounted) {
      setHoveredUnit(null);
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    // マウス位置のコマを検索
    const unit = gameState.units.find((u) => u.x === x && u.y === y);
    
    if (unit) {
      setHoveredUnit({
        unit,
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      setHoveredUnit(null);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredUnit(null);
  };
  
  // 背景パターンを固定（useMemoで一度だけ生成、Hydrationエラーを防ぐ）
  const backgroundPattern = useMemo(() => {
    const pattern: Array<Array<{ color: string; dots: Array<{ x: number; y: number }> }>> = [];
    const grassColor = "#7cb342"; // 全て同じ色
    
    for (let y = 0; y < 30; y++) {
      pattern[y] = [];
      for (let x = 0; x < 30; x++) {
        const dots: Array<{ x: number; y: number }> = [];
        // 固定のドット位置（cellSizeに依存しない固定値を使用）
        const fixedCellSize = 15; // 固定値を使用
        for (let i = 0; i < 3; i++) {
          dots.push({
            x: ((x * 7 + y * 11 + i * 13) % fixedCellSize),
            y: ((x * 13 + y * 7 + i * 17) % fixedCellSize),
          });
        }
        pattern[y]!.push({
          color: grassColor,
          dots,
        });
      }
    }
    return pattern;
  }, []); // 依存配列を空にして、一度だけ生成

  useEffect(() => {
    if (!gameState || !canvasRef.current || !isMounted || backgroundPattern.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

      try {
        const boardSize = gameState.boardSize || 30;
        const size = cellSize * boardSize;
        canvas.width = size;
        canvas.height = size;

      // 地形と背景を描画
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const px = x * cellSize;
          const py = y * cellSize;
          const cell = gameState.cells[y]?.[x];
          const terrain = cell?.terrain || "plain";
          
          // 基本の緑背景を描画（全ての地形の下に）
          const pattern = backgroundPattern[y]?.[x] || { color: "#7cb342", dots: [] };
          ctx.fillStyle = pattern.color;
          ctx.fillRect(px, py, cellSize, cellSize);
          
          // 草のテクスチャ（平地以外でも一部表示）
          ctx.fillStyle = "#689f38";
          for (const dot of pattern.dots) {
            ctx.fillRect(px + dot.x, py + dot.y, 1, 1);
          }
          
          // 地形に応じた画像を描画
          const terrainImage = getTerrainImage(terrain);
          if (terrainImage) {
            try {
              // 画像が読み込まれている場合は描画
              if (terrainImage.complete && terrainImage.naturalWidth > 0) {
                ctx.drawImage(terrainImage, px, py, cellSize, cellSize);
              }
            } catch (error) {
              // 画像読み込みエラー時はフォールバック
              drawTerrainFallback(ctx, px, py, cellSize, terrain);
            }
          } else {
            // 画像がない場合はフォールバック描画
            drawTerrainFallback(ctx, px, py, cellSize, terrain);
          }
        }
      }

      // 領地を描画（半透明で重ねる）
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const cell = gameState.cells[y]?.[x];
          if (!cell) continue;

          const px = x * cellSize;
          const py = y * cellSize;

          // 領地の色（透過度を上げて見やすく）
          if (cell.ownerFactionId === "faction-a") {
            ctx.fillStyle = "rgba(33, 150, 243, 0.75)"; // 青（透過度上げる）
            ctx.fillRect(px, py, cellSize, cellSize);
          } else if (cell.ownerFactionId === "faction-b") {
            ctx.fillStyle = "rgba(244, 67, 54, 0.75)"; // 赤（透過度上げる）
            ctx.fillRect(px, py, cellSize, cellSize);
          } else if (cell.ownerFactionId === "faction-c") {
            ctx.fillStyle = "rgba(76, 175, 80, 0.75)"; // 緑（透過度上げる）
            ctx.fillRect(px, py, cellSize, cellSize);
          } else if (cell.ownerFactionId === "faction-d") {
            ctx.fillStyle = "rgba(255, 152, 0, 0.75)"; // オレンジ（透過度上げる）
            ctx.fillRect(px, py, cellSize, cellSize);
          }

          // グリッド線（薄く）
          ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }

      // コマをドット絵風に描画
      for (const unit of gameState.units) {
        const px = unit.x * cellSize;
        const py = unit.y * cellSize;

        const centerX = px + cellSize / 2;
        const centerY = py + cellSize / 2;
        const unitSize = cellSize * 0.85;

        // ドット絵風のコマを描画
        ctx.imageSmoothingEnabled = false; // ドット絵風にする

        // 戦闘中のコマは赤い枠を描画
        if (unit.inCombat) {
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }

        if (unit.isHero) {
          // 英雄：金色のドット絵キャラ
          drawPixelArtHero(ctx, centerX, centerY, unitSize, unit.factionId);
        } else if (unit.sex === "male") {
          // 雄：四角形ベースのドット絵キャラ
          drawPixelArtMale(ctx, centerX, centerY, unitSize, unit.factionId);
        } else {
          // 雌：円形ベースのドット絵キャラ
          drawPixelArtFemale(ctx, centerX, centerY, unitSize, unit.factionId);
        }

        // valueを表示（ドット絵風のフォント、戦闘中は赤色）
        ctx.fillStyle = unit.inCombat ? "#ff0000" : "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.font = `bold ${Math.floor(cellSize * 0.4)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeText(
          unit.value.toString(),
          centerX,
          centerY + unitSize / 2 - 2,
        );
        ctx.fillText(
          unit.value.toString(),
          centerX,
          centerY + unitSize / 2 - 2,
        );
      }
    } catch (error) {
      console.error("Error drawing game board:", error);
    }
  }, [gameState, cellSize, backgroundPattern, isMounted]);

  // サーバー側では何もレンダリングしない（Hydrationエラーを防ぐ）
  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex justify-center relative">
      <canvas
        ref={canvasRef}
        className="border-4 border-green-500 shadow-2xl cursor-pointer"
        style={{ 
          imageRendering: "pixelated",
          imageRendering: "-moz-crisp-edges",
          imageRendering: "crisp-edges",
          boxShadow: "0 0 20px rgba(0, 255, 0, 0.5)"
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredUnit && isMounted && (
        <div
          className="absolute bg-black border-2 border-green-500 text-green-400 p-2 pointer-events-none z-10"
          style={{
            left: `${Math.min(hoveredUnit.x + 10, typeof window !== 'undefined' ? window.innerWidth - 200 : hoveredUnit.x + 10)}px`,
            top: `${Math.max(hoveredUnit.y - 10, 10)}px`,
            transform: hoveredUnit.y < 100 ? "translateY(0)" : "translateY(-100%)",
            fontFamily: "Courier New, monospace",
            fontSize: "12px",
            boxShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
            maxWidth: "200px",
          }}
        >
          <div className="font-bold text-green-500">
            特性: {getTraitInfo(hoveredUnit.unit.trait).name}
          </div>
          <div className="text-xs text-green-300 mb-1">
            {getTraitInfo(hoveredUnit.unit.trait).description}
          </div>
          <div>性別: {hoveredUnit.unit.sex === "male" ? "雄" : "雌"}</div>
          <div>Value: {hoveredUnit.unit.value}</div>
          {hoveredUnit.unit.inCombat && <div className="text-red-400">⚔️ 戦闘中</div>}
          {hoveredUnit.unit.isHero && <div className="text-yellow-400">★ 英雄</div>}
        </div>
      )}
    </div>
  );
}

// ドット絵風の雄キャラクターを描画
function drawPixelArtMale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  factionId: string,
) {
  const pixelSize = size / 8; // 8x8のドット絵
  let baseColor = "#2196F3";
  let darkColor = "#1976D2";
  if (factionId === "faction-a") {
    baseColor = "#2196F3"; // 青
    darkColor = "#1976D2";
  } else if (factionId === "faction-b") {
    baseColor = "#F44336"; // 赤
    darkColor = "#D32F2F";
  } else if (factionId === "faction-c") {
    baseColor = "#4CAF50"; // 緑
    darkColor = "#388E3C";
  } else if (factionId === "faction-d") {
    baseColor = "#FF9800"; // オレンジ
    darkColor = "#F57C00";
  }

  // ドット絵パターン（8x8）
  const pattern = [
    [0, 0, 1, 1, 1, 1, 0, 0], // 頭
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 2, 1, 1, 2, 1, 1], // 目
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 3, 3, 3, 3, 1, 0], // 体
    [1, 3, 3, 3, 3, 3, 3, 1],
    [1, 3, 0, 3, 3, 0, 3, 1], // 足
    [0, 1, 0, 0, 0, 0, 1, 0],
  ];

  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const pixelX = x - size / 2 + px * pixelSize;
      const pixelY = y - size / 2 + py * pixelSize;
      const color = pattern[py]![px]!;

      if (color === 1) {
        ctx.fillStyle = baseColor;
      } else if (color === 2) {
        ctx.fillStyle = "#000"; // 目
      } else if (color === 3) {
        ctx.fillStyle = darkColor;
      } else {
        continue;
      }

      ctx.fillRect(
        Math.floor(pixelX),
        Math.floor(pixelY),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    }
  }
}

// ドット絵風の雌キャラクターを描画
function drawPixelArtFemale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  factionId: string,
) {
  const pixelSize = size / 8;
  let baseColor = "#2196F3";
  let darkColor = "#1976D2";
  if (factionId === "faction-a") {
    baseColor = "#2196F3"; // 青
    darkColor = "#1976D2";
  } else if (factionId === "faction-b") {
    baseColor = "#F44336"; // 赤
    darkColor = "#D32F2F";
  } else if (factionId === "faction-c") {
    baseColor = "#4CAF50"; // 緑
    darkColor = "#388E3C";
  } else if (factionId === "faction-d") {
    baseColor = "#FF9800"; // オレンジ
    darkColor = "#F57C00";
  }
  const accentColor = "#FF69B4"; // ピンクのアクセント

  // ドット絵パターン（8x8）- 雌は円形ベース
  const pattern = [
    [0, 0, 1, 1, 1, 1, 0, 0], // 頭（丸い）
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 2, 1, 1, 2, 1, 1], // 目
    [1, 1, 1, 4, 4, 1, 1, 1], // 口（ピンク）
    [0, 1, 3, 3, 3, 3, 1, 0], // 体
    [1, 3, 3, 3, 3, 3, 3, 1],
    [1, 3, 0, 3, 3, 0, 3, 1], // 足
    [0, 1, 0, 0, 0, 0, 1, 0],
  ];

  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const pixelX = x - size / 2 + px * pixelSize;
      const pixelY = y - size / 2 + py * pixelSize;
      const color = pattern[py]![px]!;

      if (color === 1) {
        ctx.fillStyle = baseColor;
      } else if (color === 2) {
        ctx.fillStyle = "#000"; // 目
      } else if (color === 3) {
        ctx.fillStyle = darkColor;
      } else if (color === 4) {
        ctx.fillStyle = accentColor; // ピンクのアクセント
      } else {
        continue;
      }

      ctx.fillRect(
        Math.floor(pixelX),
        Math.floor(pixelY),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    }
  }
}

// ドット絵風の英雄キャラクターを描画
function drawPixelArtHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  factionId: string,
) {
  const pixelSize = size / 8;
  const goldColor = "#FFD700";
  const darkGold = "#FFA500";
  let baseColor = "#2196F3";
  if (factionId === "faction-a") {
    baseColor = "#2196F3"; // 青
  } else if (factionId === "faction-b") {
    baseColor = "#F44336"; // 赤
  } else if (factionId === "faction-c") {
    baseColor = "#4CAF50"; // 緑
  } else if (factionId === "faction-d") {
    baseColor = "#FF9800"; // オレンジ
  }

  // 英雄のドット絵パターン（8x8）- 金色で目立つ
  const pattern = [
    [0, 0, 5, 5, 5, 5, 0, 0], // 頭（金色）
    [0, 5, 5, 5, 5, 5, 5, 0],
    [5, 5, 2, 5, 5, 2, 5, 5], // 目
    [5, 5, 5, 5, 5, 5, 5, 5],
    [0, 5, 1, 1, 1, 1, 5, 0], // 体（勢力色）
    [5, 1, 1, 1, 1, 1, 1, 5],
    [5, 1, 0, 1, 1, 0, 1, 5], // 足
    [0, 5, 0, 0, 0, 0, 5, 0],
  ];

  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const pixelX = x - size / 2 + px * pixelSize;
      const pixelY = y - size / 2 + py * pixelSize;
      const color = pattern[py]![px]!;

      if (color === 1) {
        ctx.fillStyle = baseColor;
      } else if (color === 2) {
        ctx.fillStyle = "#000"; // 目
      } else if (color === 5) {
        ctx.fillStyle = goldColor; // 金色
      } else {
        continue;
      }

      ctx.fillRect(
        Math.floor(pixelX),
        Math.floor(pixelY),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    }
  }

  // 星マークを追加
  ctx.fillStyle = "#FFD700";
  ctx.font = `${size * 0.5}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", x, y - size / 2 - 2);
}
