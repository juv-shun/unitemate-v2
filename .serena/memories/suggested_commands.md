# 推奨コマンド

## 開発コマンド

### 開発サーバー起動
```bash
pnpm dev
```
Vite開発サーバーを起動（HMR有効）

### ビルド
```bash
pnpm build
```
TypeScriptコンパイル後、本番用ビルドを生成（dist/）

### プレビュー
```bash
pnpm preview
```
ビルド後のアプリをローカルでプレビュー

### Lint
```bash
pnpm lint
```
ESLintでコード品質チェック

### Format（Biome）
```bash
pnpm exec biome format --write .
```
Biomeでコードをフォーマット

### Check（Biome）
```bash
pnpm exec biome check --write .
```
Biomeでlintとformatを同時実行

## Firebase関連

### デプロイ
```bash
firebase deploy
```
Firebase Hostingへデプロイ

### ローカルエミュレータ
```bash
firebase emulators:start
```
Firebaseエミュレータを起動

## その他

### 依存関係インストール
```bash
pnpm install
```

### 依存関係追加
```bash
pnpm add <package-name>
```

### 開発用依存関係追加
```bash
pnpm add -D <package-name>
```

## Darwin（macOS）特有のコマンド
- `ls`, `cd`, `grep`, `find` などの基本的なUnixコマンドが使用可能
- パスは `/Users/` から始まる形式
