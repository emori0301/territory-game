# コマ生成条件まとめ

## 1. 初期コマ生成（ゲーム開始時）

**場所**: `lib/game/initialization.ts` - `placeInitialUnits()`

**条件**:
- 各勢力ごとに `INITIAL_UNITS_PER_FACTION` 体を生成
- 4勢力を四隅に配置：
  - 勢力A: 左上（0, 0）から (boardSize/3, boardSize/3) の範囲
  - 勢力B: 右上（boardSize*2/3, 0）から (boardSize, boardSize/3) の範囲
  - 勢力C: 左下（0, boardSize*2/3）から (boardSize/3, boardSize) の範囲
  - 勢力D: 右下（boardSize*2/3, boardSize*2/3）から (boardSize, boardSize) の範囲

**生成条件**:
- 空きマス（`cell.unitId === null`）
- 水地形ではない（`cell.terrain !== "water"`）
- 岩地形ではない（`cell.terrain !== "rock"`）
- 最大100回試行（配置できない場合はスキップ）

**初期値**:
- `value`: `INITIAL_UNIT_VALUE`（定数）
- `sex`: ランダム（50%の確率で雄/雌）
- `trait`: 性別に応じたランダム特性
- `isHero`: `false`
- `inCombat`: `false`

---

## 2. 拠点からのコマ生成

**場所**: `lib/game/tick.ts` - `spawnUnitsFromBases()`

**条件**:
- 拠点が存在する（`cell.baseId !== null`）
- 拠点作成から20tick経過している（`ticksSinceCreation % 20 === 0`）
- 拠点の周囲（上下左右）に空きマスがある
- 空きマスの地形が水でも山でもない（`terrain !== "water" && terrain !== "mountain"`）

**生成条件**:
- 空きマス（`adjacentCell.unitId === null`）
- 地形を通れる（水・山以外）

**生成値**:
- `value`: `15`
- `sex`: ランダム
- `trait`: 性別に応じたランダム特性
- `factionId`: 拠点の勢力ID
- `isHero`: `false`
- `inCombat`: `false`

**制限**:
- 1つの拠点から1tickに1体のみ生成

---

## 3. 領地からのコマ生成

**削除済み**: 拠点システムが導入されたため、3×3の領地からのコマ生成は削除されました。
コマ生成は拠点からのみ行われます。

---

## 4. 繁殖によるコマ生成（雄×雌）

**場所**: `lib/game/collision.ts` - `handleMaleFemaleCollision()`

**条件**:
- 同じマスに雄と雌のコマがいる（同勢力）
- 隣接する空きマスがある

**生成条件**:
- 隣接する空きマス（`getAdjacentEmptyCells()`で取得）
- 空きマスがない場合は不発（生成されない）

**生成値**:
- `value`: `Math.floor((male.value + female.value) / 2)`（両親の平均）
- `sex`: ランダム
- `trait`: 性別に応じたランダム特性
- `factionId`: 親の勢力ID
- `isHero`: `false`
- `inCombat`: `false`

**親への影響**:
- 両親の`value`が-2される

---

## 5. 英雄誕生

**場所**: `lib/game/tick.ts` - `checkHeroBirth()`

**条件**:
- 勢力のコマ数が全体の20%未満（`HERO_BIRTH_THRESHOLD`）
- その勢力に英雄がいない
- `HERO_BIRTH_PROBABILITY`の確率で発生

**効果**:
- 既存のコマが英雄化される（`isHero: true`）
- 特性は維持される

---

## 拠点作成条件（参考）

**場所**: `lib/game/tick.ts` - `executeTick()`内

**条件**:
1. コマの`value >= 15`
2. 通れない地形ではない（山・水は除外、それ以外は可能）
   - 平地、岩、木、沼地は作成可能
   - 色が塗られていても作成可能
3. そのマスに拠点がない（`cell.baseId === null`）
4. そのマスにコマがいる（合体処理後も確認）
5. 周囲8マス（上下左右+斜め）に拠点がない
6. 戦闘中ではない（`!unit.inCombat`）
7. `value >= 10`（拠点作成コスト）

**効果**:
- `value`が10消費される
- 拠点が作成される（`cell.baseId`, `cell.baseFactionId`, `cell.baseCreatedTick`が設定される）

