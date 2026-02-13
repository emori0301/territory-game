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

    const size = cellSize * 30;
    canvas.width = size;
    canvas.height = size;

    // 背景をクリア
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, size, size);

    // 領地を描画
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        const cell = gameState.cells[y]?.[x];
        if (!cell) continue;

        const px = x * cellSize;
        const py = y * cellSize;

        // 領地の色
        if (cell.ownerFactionId === "faction-a") {
          ctx.fillStyle = "#3b82f6"; // 青
          ctx.fillRect(px, py, cellSize, cellSize);
        } else if (cell.ownerFactionId === "faction-b") {
          ctx.fillStyle = "#ef4444"; // 赤
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        // グリッド線
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }

    // コマを描画
    for (const unit of gameState.units) {
      const px = unit.x * cellSize;
      const py = unit.y * cellSize;

      // コマの色（勢力ごと）
      const baseColor = unit.factionId === "faction-a" ? "#60a5fa" : "#f87171";
      ctx.fillStyle = unit.isHero ? "#fbbf24" : baseColor; // 英雄は黄色

      // コマを円で描画
      const centerX = px + cellSize / 2;
      const centerY = py + cellSize / 2;
      const radius = (cellSize * 0.7) / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 英雄の場合は星マーク
      if (unit.isHero) {
        ctx.fillStyle = "#fff";
        ctx.font = `${cellSize * 0.6}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", centerX, centerY);
      }

      // valueを表示（小さく）
      ctx.fillStyle = "#fff";
      ctx.font = `${cellSize * 0.4}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        unit.value.toString(),
        centerX,
        centerY + radius - 2,
      );
    }
  }, [gameState, cellSize]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="border border-gray-600 rounded"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

