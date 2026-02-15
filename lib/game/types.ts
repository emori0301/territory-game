// ゲームの型定義

export type Sex = "male" | "female";
export type UnitTrait = "craftsman" | "warrior" | "berserker" | "wanderer" | "scout" | "invader" | "builder" | "normal";
export type TerrainType = "plain" | "water" | "rock" | "tree" | "swamp" | "mountain";

export interface Unit {
  id: string;
  factionId: string;
  x: number;
  y: number;
  sex: Sex;
  value: number;
  isHero: boolean;
  trait: UnitTrait; // コマの特性
  inCombat: boolean; // 戦闘中フラグ
}

export interface Cell {
  x: number;
  y: number;
  ownerFactionId: string | null;
  unitId: string | null;
  terrain: TerrainType; // 地形タイプ
  baseId: string | null; // 拠点ID（拠点がある場合）
  baseFactionId: string | null; // 拠点の勢力ID
  baseCreatedTick: number | null; // 拠点が作成されたtick
}

export interface Faction {
  id: string;
  name: string;
}

export interface GameState {
  id: string;
  status: "playing" | "finished";
  tick: number;
  winnerId: string | null;
  factions: Faction[];
  units: Unit[];
  cells: Cell[][]; // 動的なサイズの2次元配列
  boardSize: number; // ボードサイズを追加
  playerFactionId: string | null; // プレイヤーが操作する勢力ID
  userCommands: UserCommand[]; // ユーザーからの命令
}

export interface UserCommand {
  unitId: string;
  type: "move" | "attack" | "createBase";
  targetX?: number;
  targetY?: number;
  targetUnitId?: string;
}

export interface MoveIntent {
  unitId: string;
  direction: "up" | "down" | "left" | "right";
}

export interface Collision {
  x: number;
  y: number;
  unitIds: string[];
}

