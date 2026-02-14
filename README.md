# MONARCHY

30×30グリッド上で自律移動するコマ（雄・雌）が領地を塗り、合体・繁殖・継続戦闘を行い、劣勢時に英雄が誕生し、最終的に一勢力が勝利する観察型シミュレーションゲーム。

## ゲームの特徴

- **4つの勢力**: 青、赤、緑、オレンジの4勢力が戦う
- **継続戦闘システム**: 敵同士が衝突すると、どちらかが死ぬまで毎tick戦闘を継続
- **多様な特性**: 塗り職人、攻撃的、狂戦士、放浪者、特攻、斥候、通常の7種類の特性
- **英雄システム**: 劣勢勢力に英雄が誕生し、周囲を自動的に塗る
- **領地からの繁殖**: 3×3以上の領地から定期的に新しいコマが生まれる
- **レトロゲーム風UI**: ドット絵風のコマとレトロゲーム風のUIデザイン

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: tRPC, Node.js
- **データベース**: PostgreSQL, Prisma ORM
- **インフラ**: Docker, docker-compose

## セットアップ

### 前提条件

- Node.js 20以上
- Docker & docker-compose
- Git

### ローカル開発環境のセットアップ

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd territory-game
```

2. **環境変数の設定**
```bash
cp .env.example .env
```

3. **Dockerでデータベースを起動**
```bash
docker-compose up -d db
```

4. **依存関係のインストール**
```bash
npm install
```

5. **Prismaのセットアップ**
```bash
npm run db:generate
npm run db:push
```

6. **開発サーバーの起動**
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### Dockerで全体を起動

```bash
docker-compose up --build
```

## 開発コマンド

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run lint` - ESLint実行
- `npm run db:generate` - Prisma Client生成
- `npm run db:push` - データベーススキーマ同期
- `npm run db:migrate` - マイグレーション実行
- `npm run db:studio` - Prisma Studio起動

## プロジェクト構造

```
territory-game/
├── app/              # Next.js App Router
│   ├── api/         # API routes (tRPC)
│   └── page.tsx     # メインページ
├── components/       # Reactコンポーネント
│   └── GameBoard.tsx # ゲームボード描画
├── server/          # tRPCサーバー
│   ├── routers/     # tRPCルーター
│   └── trpc.ts      # tRPC設定
├── lib/             # ユーティリティ
│   ├── game/        # ゲームロジック
│   ├── prisma.ts    # Prisma Client
│   └── trpc/        # tRPCクライアント
├── prisma/          # Prisma設定
│   └── schema.prisma
├── public/          # 静的ファイル
│   └── music/       # BGMファイル
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## ゲーム設定

- **マスの大きさ**: 10-30ピクセル（設定画面で変更可能）
- **勢力数**: 2-4勢力（設定画面で変更可能）
- **音楽音量**: 0-100%（設定画面で調整可能）

## ライセンス

MIT
