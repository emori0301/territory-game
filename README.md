# 陣地トリゲーム

30×30グリッド上で自律移動するコマ（雄・雌）が領地を塗り、合体・繁殖・均等化を行い、劣勢時に英雄が誕生し、最終的に一勢力が勝利する観察型シミュレーションゲーム。

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
├── server/          # tRPCサーバー
│   ├── routers/     # tRPCルーター
│   └── trpc.ts      # tRPC設定
├── lib/             # ユーティリティ
│   ├── prisma.ts    # Prisma Client
│   └── trpc/        # tRPCクライアント
├── prisma/          # Prisma設定
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## GitHub連携

1. **GitHubでリポジトリを作成**
2. **リモートリポジトリを追加**
```bash
git remote add origin <repository-url>
```

3. **初回コミット**
```bash
git add .
git commit -m "Initial commit: 環境構築完了"
git push -u origin main
```

## ライセンス

MIT

