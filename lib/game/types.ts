// ゲームの型定義

export type Sex = "male" | "female";
export type UnitTrait = "painter" | "aggressive" | "berserker" | "wanderer" | "kamikaze" | "scout" | "normal";

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
  cells: Cell[][]; // 30x30の2次元配列
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

