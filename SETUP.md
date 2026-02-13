# セットアップ手順

## Docker Desktopが起動しない場合の代替方法

### ローカルPostgreSQLを使用する方法

1. **PostgreSQLを起動**
   ```bash
   brew services start postgresql@14
   ```

2. **データベースを作成**
   ```bash
   createdb territory_game
   ```

3. **接続確認**
   ```bash
   psql -d territory_game -c "SELECT version();"
   ```

4. **依存関係のインストール**
   ```bash
   cd ~/territory-game
   # npmキャッシュの権限修正（必要に応じて）
   sudo chown -R 501:20 "/Users/uekikazushi/.npm"
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

## Docker Desktopを使用する場合

1. **Docker Desktopを起動**
   - アプリケーションから「Docker」を起動
   - メニューバーにDockerアイコンが表示されるまで待つ

2. **データベースを起動**
   ```bash
   cd ~/territory-game
   /Applications/Docker.app/Contents/Resources/bin/docker compose up -d db
   ```

3. **依存関係のインストール**
   ```bash
   npm install
   ```

4. **Prismaのセットアップ**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

## トラブルシューティング

### PostgreSQLの接続エラーが出る場合

`.env`ファイルの`DATABASE_URL`を確認してください：
- ローカルPostgreSQL: `postgresql://ユーザー名@localhost:5432/territory_game?schema=public`
- Docker: `postgresql://postgres:postgres@localhost:5432/territory_game?schema=public`

### npm installが失敗する場合

```bash
sudo chown -R 501:20 "/Users/uekikazushi/.npm"
```

### Docker Desktopが起動しない場合

1. システム環境設定 → セキュリティとプライバシーでDocker Desktopへのアクセス許可を確認
2. Docker Desktopを再インストール
3. または、ローカルPostgreSQLを使用（上記参照）

