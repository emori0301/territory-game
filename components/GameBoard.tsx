"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import type { GameState, UnitTrait, TerrainType, Cell, Unit } from "@/lib/game/types";

interface GameBoardProps {
  gameState: GameState | null;
  cellSize?: number;
  playerFactionId?: string | null;
  selectedUnitIds?: Set<string>;
  onUnitClick?: (unitId: string, x: number, y: number) => void;
  onCellClick?: (x: number, y: number) => void;
  onHoverCell?: (cell: { cell: Cell; unit: Unit | null; x: number; y: number } | null) => void;
}

export function GameBoard({ 
  gameState, 
  cellSize = 15,
  playerFactionId = null,
  onUnitClick,
  onCellClick,
  selectedUnitIds = new Set(),
  onHoverCell,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ cell: Cell; unit: Unit | null; x: number; y: number } | null>(null);
  const lastHoveredRef = useRef<{ x: number; y: number } | null>(null);
  
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
  
  // 拠点（家）の画像を読み込み
  const houseImage = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // 地形画像のURL（SVGファイルを使用）
    const imageUrls: Record<TerrainType, string> = {
      plain: "/images/terrain/grass.svg",
      water: "/images/terrain/water.svg",
      rock: "/images/terrain/rock.svg",
      tree: "/images/terrain/tree.svg",
      swamp: "/images/terrain/swamp.svg",
      mountain: "/images/terrain/mountain.svg",
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
    
    // 家の画像を読み込み
    const houseImg = new Image();
    houseImg.onload = () => {
      houseImage.current = houseImg;
    };
    houseImg.onerror = () => {
      houseImage.current = null;
    };
    houseImg.src = "/images/terrain/house.svg";
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
        ctx.fillStyle = "rgba(0, 188, 212, 0.8)"; // シアン（水、青勢力と区別しやすく）
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#00838F";
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
  
  // マウス移動イベントハンドラー
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current || !isMounted) {
      setHoveredCell(null);
      lastHoveredRef.current = null;
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    // 前回と同じセルの場合は更新しない（チラつき防止）
    if (lastHoveredRef.current && lastHoveredRef.current.x === x && lastHoveredRef.current.y === y) {
      return;
    }
    
    lastHoveredRef.current = { x, y };
    
    // マウス位置のセルとコマを取得
    const cell = gameState.cells[y]?.[x];
    const unit = gameState.units.find((u) => u.x === x && u.y === y);
    
    if (cell) {
      const hoverData = {
        cell,
        unit: unit || null,
        x,
        y,
      };
      setHoveredCell(hoverData);
      if (onHoverCell) onHoverCell(hoverData);
    } else {
      setHoveredCell(null);
      if (onHoverCell) onHoverCell(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    lastHoveredRef.current = null;
    if (onHoverCell) onHoverCell(null);
  };

  // クリックイベントハンドラー
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current || !isMounted) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    // クリック位置のコマを取得
    const unit = gameState.units.find((u) => u.x === x && u.y === y);
    
    if (unit && onUnitClick) {
      // コマがクリックされた場合
      onUnitClick(unit.id, x, y);
    } else if (onCellClick) {
      // セルがクリックされた場合
      onCellClick(x, y);
    }
  };
  
  // 地形名を日本語で取得
  const getTerrainName = (terrain: TerrainType): string => {
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
  const getFactionName = (factionId: string | null): string => {
    if (!factionId) return "なし";
    const faction = gameState?.factions.find((f) => f.id === factionId);
    return faction?.name || factionId;
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

      // 拠点（家）をコマの前に描画（コマより下に描画して、拠点が見えるようにする）
      // まず拠点の数をカウント（デバッグ用）
      let baseCount = 0;
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const cell = gameState.cells[y]?.[x];
          if (cell && cell.baseId && cell.baseFactionId) {
            baseCount++;
          }
        }
      }
      if (baseCount > 0) {
        console.log(`[描画] 拠点数: ${baseCount}`);
      }
      
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const cell = gameState.cells[y]?.[x];
          if (!cell || !cell.baseId || !cell.baseFactionId) continue;
          
          // デバッグログ（最初の拠点のみ）
          if (baseCount > 0 && x === 0 && y === 0) {
            console.log(`[描画] 拠点を描画: pos=(${x},${y}), baseId=${cell.baseId}, faction=${cell.baseFactionId}`);
          }

          const px = x * cellSize;
          const py = y * cellSize;
          
          // そのマスにコマがいるかチェック
          const unitAtBase = gameState.units.find(u => u.x === x && u.y === y);
          
          // 家の画像を使用して描画（常に大きく、目立つように）
          if (houseImage.current && houseImage.current.complete && houseImage.current.naturalWidth > 0) {
            // 画像が読み込まれている場合は画像を使用（常に大きく表示）
            const houseSize = cellSize * 0.9; // 常に大きく表示
            const houseX = px + (cellSize - houseSize) / 2;
            const houseY = py + (cellSize - houseSize) / 2;
            
            // 勢力色でフィルターを適用（画像の色を変更）
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            
            // 勢力色に合わせて色調を変更
            if (cell.baseFactionId === "faction-a") {
              ctx.filter = "hue-rotate(200deg) saturate(1.5)";
            } else if (cell.baseFactionId === "faction-b") {
              ctx.filter = "hue-rotate(0deg) saturate(1.5)";
            } else if (cell.baseFactionId === "faction-c") {
              ctx.filter = "hue-rotate(100deg) saturate(1.5)";
            } else if (cell.baseFactionId === "faction-d") {
              ctx.filter = "hue-rotate(30deg) saturate(1.5)";
            }
            
            ctx.drawImage(houseImage.current, houseX, houseY, houseSize, houseSize);
            ctx.restore();
          } else {
            // 画像が読み込まれていない場合はフォールバック描画（常に大きく表示）
            const iconSize = cellSize * 0.9; // 常に大きく表示
            const iconX = px + (cellSize - iconSize) / 2;
            const iconY = py + (cellSize - iconSize) / 2;
            
            // 屋根（勢力色に合わせる）
            let roofColor = "#8B4513";
            if (cell.baseFactionId === "faction-a") {
              roofColor = "#1565C0";
            } else if (cell.baseFactionId === "faction-b") {
              roofColor = "#C62828";
            } else if (cell.baseFactionId === "faction-c") {
              roofColor = "#2E7D32";
            } else if (cell.baseFactionId === "faction-d") {
              roofColor = "#E65100";
            }
            
            ctx.fillStyle = roofColor;
            ctx.beginPath();
            ctx.moveTo(iconX + iconSize / 2, iconY + iconSize * 0.1);
            ctx.lineTo(iconX + iconSize * 0.15, iconY + iconSize * 0.35);
            ctx.lineTo(iconX + iconSize * 0.85, iconY + iconSize * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 壁
            ctx.fillStyle = "#DEB887";
            ctx.fillRect(iconX + iconSize * 0.2, iconY + iconSize * 0.35, iconSize * 0.6, iconSize * 0.55);
            ctx.strokeStyle = "#8B4513";
            ctx.lineWidth = 1;
            ctx.strokeRect(iconX + iconSize * 0.2, iconY + iconSize * 0.35, iconSize * 0.6, iconSize * 0.55);
            
            // ドア
            ctx.fillStyle = "#654321";
            ctx.fillRect(iconX + iconSize * 0.4, iconY + iconSize * 0.6, iconSize * 0.2, iconSize * 0.3);
            
            // 窓
            ctx.fillStyle = "#87CEEB";
            ctx.fillRect(iconX + iconSize * 0.28, iconY + iconSize * 0.42, iconSize * 0.08, iconSize * 0.08);
            ctx.fillRect(iconX + iconSize * 0.64, iconY + iconSize * 0.42, iconSize * 0.08, iconSize * 0.08);
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 1;
            ctx.strokeRect(iconX + iconSize * 0.28, iconY + iconSize * 0.42, iconSize * 0.08, iconSize * 0.08);
            ctx.strokeRect(iconX + iconSize * 0.64, iconY + iconSize * 0.42, iconSize * 0.08, iconSize * 0.08);
          }
        }
      }

      // コマをドット絵風に描画（拠点の後に描画）
      for (const unit of gameState.units) {
        const px = unit.x * cellSize;
        const py = unit.y * cellSize;

        const centerX = px + cellSize / 2;
        const centerY = py + cellSize / 2;
        const unitSize = cellSize * 0.85;

        // ドット絵風のコマを描画
        ctx.imageSmoothingEnabled = false; // ドット絵風にする

        // 選択されたコマは青い枠を描画
        if (selectedUnitIds.has(unit.id)) {
          ctx.strokeStyle = "#00ffff";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }

        // 戦闘中のコマは赤い枠を描画
        if (unit.inCombat) {
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
        
        // プレイヤー勢力のコマの黄色い枠は削除（勢力図の枠で点滅表示するため）

        if (unit.isHero) {
          // 英雄：金色のドット絵キャラ
          drawPixelArtHero(ctx, centerX, centerY, unitSize, unit.factionId);
        } else if (unit.sex === "male") {
          // 雄：四角形ベースのドット絵キャラ（戦力で見た目を変える）
          drawPixelArtMale(ctx, centerX, centerY, unitSize, unit.factionId, unit.value);
        } else {
          // 雌：円形ベースのドット絵キャラ（戦力で見た目を変える）
          drawPixelArtFemale(ctx, centerX, centerY, unitSize, unit.factionId, unit.value);
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
  }, [gameState, cellSize, backgroundPattern, isMounted, playerFactionId, selectedUnitIds]);

  // サーバー側では何もレンダリングしない（Hydrationエラーを防ぐ）
  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex justify-center relative">
      <canvas
        ref={canvasRef}
        className="border-4 border-white shadow-2xl cursor-pointer"
        style={{ 
          imageRendering: "pixelated",
          imageRendering: "-moz-crisp-edges",
          imageRendering: "crisp-edges",
          boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)"
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
}

// ドット絵風の雄キャラクターを描画（四角形ベース、より角ばった、戦力で見た目を変える）
function drawPixelArtMale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  factionId: string,
  value: number,
) {
  // 戦力に応じて見た目を変える（1-20, 21-50, 51-100, 100+）
  let tier = 0;
  if (value >= 100) tier = 3;
  else if (value >= 51) tier = 2;
  else if (value >= 21) tier = 1;
  else tier = 0;
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

  // 戦力に応じたドット絵パターン（8x8）- 雄は四角形ベース、角ばった
  // tier 0: 1-20（小さくシンプル）
  // tier 1: 21-50（中サイズ、少し装飾）
  // tier 2: 51-100（大きめ、装飾あり）
  // tier 3: 100+（最大、豪華な装飾）
  const patterns = [
    // tier 0: 1-20
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 3, 3, 3, 3, 0, 0],
      [0, 3, 3, 3, 3, 3, 3, 0],
      [0, 3, 0, 3, 3, 0, 3, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    // tier 1: 21-50
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 2, 1, 1, 2, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [1, 3, 3, 3, 3, 3, 3, 1],
      [1, 3, 0, 3, 3, 0, 3, 1],
      [0, 1, 0, 0, 0, 0, 1, 0],
    ],
    // tier 2: 51-100
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 4, 4, 1, 1, 0],
      [1, 1, 2, 1, 1, 2, 1, 1],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [1, 3, 3, 4, 4, 3, 3, 1],
      [1, 3, 0, 3, 3, 0, 3, 1],
      [0, 1, 0, 1, 1, 0, 1, 0],
    ],
    // tier 3: 100+
    [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [1, 2, 1, 4, 4, 1, 2, 1],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [1, 3, 3, 3, 3, 3, 3, 1],
      [3, 3, 4, 3, 3, 4, 3, 3],
      [3, 0, 3, 4, 4, 3, 0, 3],
      [1, 0, 1, 1, 1, 1, 0, 1],
    ],
  ];
  
  const pattern = patterns[tier]!;
  const accentColor = tier >= 2 ? "#FFD700" : baseColor; // tier 2以上は金色のアクセント

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
        ctx.fillStyle = accentColor; // 装飾（tier 2以上）
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
  
  // 雄のマーク（♂）を小さく表示
  ctx.fillStyle = "#000";
  ctx.font = `${Math.floor(size * 0.3)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("♂", x, y - size / 2 + 1);
}

// ドット絵風の雌キャラクターを描画（円形ベース、ピンクのアクセント、より丸い、戦力で見た目を変える）
function drawPixelArtFemale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  factionId: string,
  value: number,
) {
  // 戦力に応じて見た目を変える（1-20, 21-50, 51-100, 100+）
  let tier = 0;
  if (value >= 100) tier = 3;
  else if (value >= 51) tier = 2;
  else if (value >= 21) tier = 1;
  else tier = 0;
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
  // 戦力に応じたドット絵パターン（8x8）- 雌は円形ベース、ピンクのアクセント
  const patterns = [
    // tier 0: 1-20
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 1, 4, 4, 1, 1, 0],
      [0, 0, 3, 3, 3, 3, 0, 0],
      [0, 3, 3, 3, 3, 3, 3, 0],
      [0, 3, 0, 3, 3, 0, 3, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    // tier 1: 21-50
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 2, 1, 1, 2, 1, 1],
      [1, 1, 1, 4, 4, 1, 1, 1],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [1, 3, 3, 3, 3, 3, 3, 1],
      [1, 3, 0, 3, 3, 0, 3, 1],
      [0, 1, 0, 0, 0, 0, 1, 0],
    ],
    // tier 2: 51-100
    [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 4, 4, 1, 1, 0],
      [1, 1, 2, 1, 1, 2, 1, 1],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [1, 3, 3, 4, 4, 3, 3, 1],
      [1, 3, 0, 3, 3, 0, 3, 1],
      [0, 1, 0, 1, 1, 0, 1, 0],
    ],
    // tier 3: 100+
    [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [1, 2, 1, 4, 4, 1, 2, 1],
      [1, 1, 4, 1, 1, 4, 1, 1],
      [1, 3, 3, 3, 3, 3, 3, 1],
      [3, 3, 4, 3, 3, 4, 3, 3],
      [3, 0, 3, 4, 4, 3, 0, 3],
      [1, 0, 1, 1, 1, 1, 0, 1],
    ],
  ];
  
  const pattern = patterns[tier]!;
  const accentColor = tier >= 2 ? "#FFD700" : "#FF69B4"; // tier 2以上は金色、それ以下はピンク

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
  
  // 雌のマーク（♀）を小さく表示
  ctx.fillStyle = "#FF69B4";
  ctx.font = `${Math.floor(size * 0.3)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("♀", x, y - size / 2 + 1);
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
