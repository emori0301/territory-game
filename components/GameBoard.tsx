"use client";

import { useEffect, useRef, useMemo } from "react";
import type { GameState } from "@/lib/game/types";

interface GameBoardProps {
  gameState: GameState | null;
  cellSize?: number;
}

export function GameBoard({ gameState, cellSize = 15 }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundPatternRef = useRef<Array<Array<{ color: string; dots: Array<{ x: number; y: number }> }>> | null>(null);
  
  // 背景パターンを固定（初回のみ生成、Hydrationエラーを防ぐ）
  if (!backgroundPatternRef.current) {
    const pattern: Array<Array<{ color: string; dots: Array<{ x: number; y: number }> }>> = [];
    const grassColor = "#7cb342"; // 全て同じ色
    
    for (let y = 0; y < 30; y++) {
      pattern[y] = [];
      for (let x = 0; x < 30; x++) {
        const dots: Array<{ x: number; y: number }> = [];
        // 固定のドット位置
        for (let i = 0; i < 3; i++) {
          dots.push({
            x: ((x * 7 + y * 11 + i * 13) % cellSize),
            y: ((x * 13 + y * 7 + i * 17) % cellSize),
          });
        }
        pattern[y]!.push({
          color: grassColor,
          dots,
        });
      }
    }
    backgroundPatternRef.current = pattern;
  }
  
  const backgroundPattern = backgroundPatternRef.current;

  useEffect(() => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const size = cellSize * 30;
      canvas.width = size;
      canvas.height = size;

      // 固定された背景を描画
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          const px = x * cellSize;
          const py = y * cellSize;
          const pattern = backgroundPattern[y]![x]!;
          
          // 背景色
          ctx.fillStyle = pattern.color;
          ctx.fillRect(px, py, cellSize, cellSize);
          
          // 草のテクスチャ（固定位置）
          ctx.fillStyle = "#689f38";
          for (const dot of pattern.dots) {
            ctx.fillRect(px + dot.x, py + dot.y, 1, 1);
          }
        }
      }

      // 領地を描画（半透明で重ねる）
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
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

        // valueを表示（ドット絵風のフォント）
        ctx.fillStyle = "#fff";
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
  }, [gameState, cellSize, backgroundPattern]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-800 rounded shadow-2xl"
        style={{ imageRendering: "pixelated" }}
      />
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
