// ゲーム定数

export const BOARD_SIZE = 30;
export const INITIAL_UNITS_PER_FACTION = 15; // 10から15に増加（より多くのコマでバトルが起きやすく）
export const INITIAL_UNIT_VALUE = 15; // 10から15に増加（ライフ減少を緩和）
export const MOVE_DISTANCE = 1; // 1マス移動
export const MAX_TICKS = 500;
export const MAX_UNITS = 300;
export const MAX_AGE = 150; // 100から150に増加（より長生きに）
export const HERO_MAX_AGE = 75; // 50から75に増加
export const HERO_BIRTH_THRESHOLD = 0.2; // 20%
export const HERO_BIRTH_PROBABILITY = 0.1; // 10%

// 自然減衰の閾値（value > 15の場合のみ減衰）
export const DECAY_THRESHOLD = 15; // 10から15に増加

// 移動時のvalue消費確率（50%の確率で消費しない）
export const MOVE_VALUE_CONSUMPTION_PROBABILITY = 0.5;

