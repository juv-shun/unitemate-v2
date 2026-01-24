# コードベース構造（最新）

## プロジェクトルート（主要なもの）
```
unitemate-v2/
├── src/                    # フロントエンドソースコード
├── functions/              # Firebase Functions（バックエンド）
├── public/                 # 静的ファイル
├── docs/                   # ドキュメント
├── dist/                   # ビルド出力（gitignore対象）
├── emulator-data/          # Firebase Emulatorのデータ
├── node_modules/           # 依存パッケージ
├── .firebase/              # Firebase設定キャッシュ
├── .serena/                # Serenaメモリ
├── .claude/                # Claude関連
├── .git/                   # Git管理
├── tmp/                    # 一時ファイル
├── index.html              # HTMLエントリポイント
├── vite.config.ts          # Vite設定
├── tsconfig.json           # TypeScript設定（ルート）
├── tsconfig.app.json       # アプリ用TypeScript設定
├── tsconfig.node.json      # Node.js用TypeScript設定
├── biome.json              # Biome設定
├── eslint.config.js        # ESLint設定
├── firebase.json           # Firebase設定
├── firestore.rules         # Firestoreルール
├── firestore.indexes.json  # Firestoreインデックス
├── storage.rules           # Storageルール
├── .firebaserc             # Firebaseプロジェクト設定
├── package.json            # パッケージ定義
├── pnpm-lock.yaml          # pnpmロックファイル
├── .env                    # 環境変数
├── .env.example            # 環境変数テンプレート
├── .env.development        # 開発用環境変数
├── .env.production         # 本番用環境変数
├── .gitignore              # Git除外設定
├── README.md               # プロジェクト説明
├── AGENTS.md               # エージェント指示
└── CLAUDE.md               # プロジェクトガイド
```

## src/ディレクトリ詳細
```
src/
├── components/
│   ├── ProtectedRoute.tsx
│   ├── Layout.tsx
│   └── Sidebar.tsx
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   └── user.ts
│   ├── draft/
│   │   ├── DraftSimulationPage.tsx
│   │   ├── MatchContext.tsx
│   │   ├── match.ts
│   │   ├── types.ts
│   │   └── components/
│   │       ├── MatchLobby.tsx
│   │       ├── TeamPanel.tsx
│   │       ├── JoinMatchForm.tsx
│   │       ├── CreateMatchButton.tsx
│   │       └── MemberSlot.tsx
│   ├── match/
│   │   └── MatchResultPage.tsx
│   ├── mypage/
│   │   └── MyPage.tsx
│   ├── onboarding/
│   │   └── OnboardingPage.tsx
│   ├── profile/
│   │   ├── HomePage.tsx
│   │   └── components/
│   │       └── GameRules.tsx
│   ├── queue/
│   │   ├── QueueContext.tsx
│   │   ├── queue.ts
│   │   ├── types.ts
│   │   ├── matchSound.ts
│   │   └── components/
│   │       ├── QueueSection.tsx
│   │       └── SearchingIndicator.tsx
│   ├── ranking/
│   │   └── RankingPage.tsx
│   ├── faq/
│   │   └── FaqPage.tsx
│   └── monitor/
│       ├── MonitorPage.tsx
│       └── monitor.ts
├── App.tsx
├── main.tsx
├── firebase.ts
└── index.css
```

## ルーティング（src/App.tsx）
- `/login`: LoginPage
- `/onboarding`: OnboardingPage
- `/`: HomePage
- `/lobby/:matchId?`: DraftSimulationPage
- `/match/:matchId?`: MatchResultPage
- `/mypage`: MyPage
- `/ranking`: RankingPage
- `/faq`: FaqPage
- `/monitor`: MonitorPage

## Firebase Functions
```
functions/src/
├── index.ts
├── lib/
│   ├── db.ts
│   ├── types.ts
│   └── utils.ts
├── matchmaking/
│   └── index.ts
├── lobby/
│   └── index.ts
├── result/
│   └── index.ts
└── report/
    └── index.ts
```
