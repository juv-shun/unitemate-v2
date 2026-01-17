# コードベース構造

## プロジェクトルート
```
unitemate-v2/
├── src/                    # ソースコード
├── public/                 # 静的ファイル
├── docs/                   # ドキュメント（要件定義書等）
├── dist/                   # ビルド出力（gitignore対象）
├── node_modules/           # 依存パッケージ
├── .firebase/              # Firebase設定キャッシュ
├── .serena/                # Serenaメモリ
├── .git/                   # Git管理
├── index.html              # HTMLエントリポイント
├── vite.config.ts          # Vite設定
├── tsconfig.json           # TypeScript設定（ルート）
├── tsconfig.app.json       # アプリ用TypeScript設定
├── tsconfig.node.json      # Node.js用TypeScript設定
├── biome.json              # Biome設定
├── eslint.config.js        # ESLint設定
├── firebase.json           # Firebase設定
├── .firebaserc             # Firebaseプロジェクト設定
├── package.json            # パッケージ定義
├── pnpm-lock.yaml          # pnpmロックファイル
├── .env                    # 環境変数（gitignore対象）
├── .env.example            # 環境変数テンプレート
├── .gitignore              # Git除外設定
└── README.md               # プロジェクト説明
```

## src/ディレクトリ詳細
```
src/
├── components/             # 再利用可能なコンポーネント
│   └── ProtectedRoute.tsx  # 認証保護ルート
├── pages/                  # ページコンポーネント
│   ├── HomePage.tsx        # ホームページ
│   └── LoginPage.tsx       # ログインページ
├── contexts/               # React Context
│   └── AuthContext.tsx     # 認証コンテキスト
├── lib/                    # ユーティリティ関数
│   └── user.ts             # ユーザー関連ユーティリティ
├── assets/                 # 静的アセット
│   └── react.svg           # Reactロゴ
├── App.tsx                 # ルートコンポーネント
├── main.tsx                # エントリポイント
├── firebase.ts             # Firebase初期化
└── index.css               # グローバルスタイル
```

## 主要ファイルの役割

### エントリポイント
- `index.html`: HTMLテンプレート
- `src/main.tsx`: Reactアプリのエントリポイント

### ルーティング
- `src/App.tsx`: React Routerによるルーティング設定

### 認証
- `src/contexts/AuthContext.tsx`: 認証状態管理
- `src/firebase.ts`: Firebase SDK初期化
- `src/components/ProtectedRoute.tsx`: 認証保護ルート

### 設定ファイル
- `vite.config.ts`: Vite設定（React plugin, Tailwind plugin）
- `biome.json`: Linter/Formatter設定
- `eslint.config.js`: ESLint設定
- `tsconfig.*.json`: TypeScript設定（app/node分離）
- `firebase.json`: Firebase Hosting設定（SPAリライトルール）

## ビルド出力
- `dist/`: 本番用ビルド成果物（Firebase Hostingのpublic）
