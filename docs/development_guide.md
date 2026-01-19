# 環境構築およびデプロイ手順書

本ドキュメントでは、ローカル開発環境の立ち上げ手順および Firebase Hosting へのデプロイ手順について記載します。

## 1. ローカル開発環境の構築

### 前提条件
以下のツールがインストールされていることを前提とします。
- **Node.js**: v18 以上推奨
- **pnpm**: パッケージマネージャー
- **Firebase CLI**: `npm install -g firebase-tools` でインストール可能

### 構築手順

1. **プロジェクトのディレクトリへ移動**
   ```bash
   cd unitemate-v2
   ```

2. **依存関係のインストール**
   ```bash
   pnpm install
   ```

3. **環境変数の設定**
   `.env.example` をコピーして、ローカル用の環境変数ファイル `.env` を作成します。
   ```bash
   cp .env.example .env
   ```
   作成した `.env` ファイルを開き、Firebase コンソールから取得した設定値（API Key, Project ID など）を入力してください。

4. **開発サーバーの起動**
   以下のコマンドでローカルサーバーを起動します。
   ```bash
   pnpm dev
   ```
   起動後、ブラウザで [http://localhost:5173](http://localhost:5173) にアクセスして画面が表示されることを確認してください。

---

## 1.5. Firebase Emulators を使った開発（推奨）

### Emulators を使うメリット
- 本番環境のデータに影響を与えずにテスト可能
- テストユーザーを無制限に作成可能（Google アカウント不要）
- 認証・Firestore の動作をローカルで確認可能
- エミュレータ再起動でデータをリセット可能

### Emulators の起動手順

1. **環境変数でエミュレータを有効化**
   `.env` ファイルに以下を追記します。
   ```bash
   VITE_USE_FIREBASE_EMULATOR=true
   ```

   **注意**: エミュレータ使用時は、他の Firebase 設定（API Key など）はダミー値でも動作します。
   ```bash
   # エミュレータ用のダミー設定例
   VITE_FIREBASE_API_KEY=demo-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-auth-domain
   VITE_FIREBASE_PROJECT_ID=demo-project
   VITE_FIREBASE_STORAGE_BUCKET=demo-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456
   VITE_FIREBASE_APP_ID=demo-app-id
   ```

2. **Emulators を起動（ターミナル1）**
   ```bash
   firebase emulators:start
   ```

   起動後、以下のサービスが利用可能になります：
   - **Authentication Emulator**: `http://localhost:9099`
   - **Firestore Emulator**: `http://localhost:8080`
   - **Emulator UI**: `http://localhost:4000` ← ユーザー管理画面

3. **開発サーバーを起動（ターミナル2）**
   別のターミナルで開発サーバーを起動します。
   ```bash
   pnpm dev
   ```

4. **Emulator UI でテストユーザーを作成**
   ブラウザで [http://localhost:4000](http://localhost:4000) を開きます。
   - **Authentication** タブを選択
   - **Add user** ボタンから任意のメールアドレスでユーザーを作成
   - アプリからログインする際、エミュレータの認証画面が表示されます

### Emulators の停止
ターミナルで `Ctrl + C` を押すと Emulators が停止します。
データはメモリ上にあるため、再起動すると初期状態に戻ります。

### 本番環境に戻す場合
`.env` ファイルの設定を変更します。
```bash
VITE_USE_FIREBASE_EMULATOR=false
```
または、該当行をコメントアウト/削除してください。

### Firestore データの確認方法
Emulator UI を使って Firestore のデータを確認・編集できます。

1. ブラウザで [http://localhost:4000](http://localhost:4000) を開く
2. **Firestore** タブを選択
3. `users` コレクションを開いてユーザーデータを確認

**主なフィールド（usersコレクション）:**
| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| `display_name` | string | 表示名 |
| `queue_status` | string/null | キュー状態（`waiting` または `null`） |
| `queue_joined_at` | timestamp/null | キュー開始時刻 |

---

## 2. Firebase へのデプロイ手順

### 初回セットアップ (プロジェクト未作成の場合)

まだ Firebase 上でプロジェクトを作成していない場合の手順です。

1. **Firebase プロジェクトの作成**
   [Firebase Console](https://console.firebase.google.com/) にアクセスし、「プロジェクトを追加」から新規プロジェクトを作成してください（例: `unitemate-v2`）。

2. **CLI でのログイン**
   ターミナルで以下を実行し、Google アカウントでログインします。
   ```bash
   firebase login
   ```

3. **プロジェクトの初期化 (Hosting)**
   プロジェクトとローカル環境を紐付けます。
   ```bash
   firebase init hosting
   ```
   **設定の選択肢:**
   - **Project Setup**: `Use an existing project` を選択し、作成したプロジェクトを選びます。
   - **Public directory**: `dist` と入力します。
     - **重要**: React (Vite) のビルド出力先は `dist` です。
   - **Configure as a single-page app?**: `Yes`
     - SPA としてルーティングを正しく動作させるため必須です。
   - **Set up automatic builds and deploys with GitHub?**: `No` (任意)
   - **File dist/index.html already exists. Overwrite?**: `No`

### デプロイ実行手順 (日常の更新)

コードの変更を本番環境に反映させる際の手順です。

1. **アプリケーションのビルド**
   リリース用の静的ファイルを生成します。
   ```bash
   pnpm build
   ```
   成功すると `dist` ディレクトリ配下にファイルが生成されます。

2. **デプロイ**
   ビルドしたファイルを Firebase Hosting にアップロードします。
   ```bash
   firebase deploy
   ```
   コマンド完了後に表示される `Hosting URL` にアクセスして、本番環境での動作を確認してください。
