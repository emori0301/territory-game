"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@/lib/game/types";

interface GameBoardProps {
  gameState: GameState | null;
  cellSize?: number;
}

export function GameBoard({ gameState, cellSize = 15 }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const size = cellSize * 30;
      canvas.width = size;
      canvas.height = size;

      // ドラゴンクエスト風の緑の草地背景
      const grassColors = ["#7cb342", "#8bc34a", "#9ccc65", "#aed581"];
      
      // 背景を草地風に描画
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          const px = x * cellSize;
          const py = y * cellSize;
          
          // ランダムに緑の色を選ぶ（ドット絵風）
          const grassColor = grassColors[Math.floor(Math.random() * grassColors.length)]!;
          ctx.fillStyle = grassColor;
          ctx.fillRect(px, py, cellSize, cellSize);
          
          // 草のテクスチャ（小さな点で）
          ctx.fillStyle = "#689f38";
          for (let i = 0; i < 3; i++) {
            const dotX = px + Math.random() * cellSize;
            const dotY = py + Math.random() * cellSize;
            ctx.fillRect(Math.floor(dotX), Math.floor(dotY), 1, 1);
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

          // 領地の色（ドット絵風の半透明）
          if (cell.ownerFactionId === "faction-a") {
            ctx.fillStyle = "rgba(33, 150, 243, 0.5)"; // 青（半透明）
            ctx.fillRect(px, py, cellSize, cellSize);
          } else if (cell.ownerFactionId === "faction-b") {
            ctx.fillStyle = "rgba(244, 67, 54, 0.5)"; // 赤（半透明）
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
  }, [gameState, cellSize]);

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
  const baseColor = factionId === "faction-a" ? "#2196F3" : "#F44336";
  const darkColor = factionId === "faction-a" ? "#1976D2" : "#D32F2F";
  const lightColor = factionId === "faction-a" ? "#64B5F6" : "#EF5350";

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
  const baseColor = factionId === "faction-a" ? "#2196F3" : "#F44336";
  const darkColor = factionId === "faction-a" ? "#1976D2" : "#D32F2F";
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
  const baseColor = factionId === "faction-a" ? "#2196F3" : "#F44336";

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
