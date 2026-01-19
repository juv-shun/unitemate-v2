# コードベース構造

## プロジェクトルート
```
unitemate-v2/
├── src/                    # フロントエンドソースコード
├── functions/              # Firebase Functions（バックエンド）
│   └── src/
│       └── index.ts        # マッチング処理（フェーズ1.3実装）
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
├── components/                    # 再利用可能なコンポーネント
│   ├── ProtectedRoute.tsx         # 認証・オンボーディング状態に基づくルート保護
│   ├── Layout.tsx                 # サイドバー付きレイアウト（認証済みページ用）
│   └── Sidebar.tsx
├── features/                      # 機能別モジュール（Feature-First Architecture）
│   ├── auth/                      # 認証機能
│   ├── draft/                     # ドラフト機能
│   ├── match/                     # マッチング機能
│   ├── mypage/                    # マイページ
│   ├── onboarding/                # オンボーディング
│   ├── profile/                   # プロフィール
│   ├── queue/                     # キュー機能
│   ├── ranking/                   # ランキング機能
│   └── stats/                     # 統計機能
# サイドメニュー（ナビゲーション・ログアウト）
├── features/                      # 機能別モジュール
│   ├── auth/                      # 認証機能
│   │   ├── AuthContext.tsx        # 認証状態管理（Google OAuth）
│   │   ├── LoginPage.tsx          # ログインページ
│   │   └── user.ts                # ユーザー関連Firestore操作
│   ├── draft/                     # ドラフト・マッチ機能
│   │   ├── DraftSimulationPage.tsx # ドラフトページ
│   │   ├── MatchContext.tsx       # マッチ状態管理（リアルタイム購読）
│   │   ├── match.ts               # マッチ関連Firestore操作
│   │   │                          # - createReport: 通報作成（matches/{matchId}/reportsに保存）
│   │   ├── types.ts               # 型定義（Match, Member, DraftSession等）
│   │   └── components/            # ドラフト関連コンポーネント
│   │       └── MatchLobby.tsx     # マッチロビー画面（通報ボタン・モーダル実装済み）
│   ├── mypage/                    # マイページ機能
│   │   └── MyPage.tsx             # プロフィール編集ページ
│   ├── onboarding/                # オンボーディング機能
│   │   └── OnboardingPage.tsx     # 初回ユーザー名入力ページ
│   ├── profile/                   # マッチング機能
│   │   └── HomePage.tsx           # マッチングページ（QueueSection表示）
│   ├── queue/                     # キュー・マッチング機能
│   │   ├── QueueContext.tsx       # キュー状態管理
│   │   ├── queue.ts               # キュー関連Firestore操作
│   │   ├── types.ts               # キュー型定義
│   │   └── components/
│   │       ├── QueueSection.tsx       # キューUIコンポーネント
│   │       └── SearchingIndicator.tsx # 検索インジケーター
│   ├── ranking/                   # ランキング機能
│   │   └── RankingPage.tsx        # ランキングページ（Coming Soon）
│   └── stats/                     # 統計機能
│       └── StatsPage.tsx          # 統計ページ（Coming Soon）
├── assets/                        # 静的アセット
│   └── react.svg                  # Reactロゴ
├── App.tsx                        # ルートコンポーネント（ルーティング設定）
├── main.tsx                       # エントリポイント
├── firebase.ts                    # Firebase初期化
└── index.css                      # グローバルスタイル（CSS変数定義）
```

## 主要ファイルの役割

### エントリポイント
- `index.html`: HTMLテンプレート
- `src/main.tsx`: Reactアプリのエントリポイント

### ルーティング（src/App.tsx）
- `/login`: ログインページ（LoginPage）- Layoutなし
- `/onboarding`: 初回ユーザー名入力ページ（OnboardingPage）- 認証必須、Layoutなし
- `/`: マッチングページ（HomePage）- 認証必須、Layout付き
- `/draft/:matchId?`: ドラフトシミュレーション（DraftSimulationPage）- 認証必須、Layout付き
- `/match/:matchId?`: マッチ成立画面（MatchResultPage）- 認証必須、Layout付き（フェーズ1.3で追加）
- `/ranking`: ランキング（RankingPage）- 認証必須、Layout付き
- `/stats`: 統計（StatsPage）- 認証必須、Layout付き
- `/mypage`: マイページ（MyPage）- 認証必須、Layout付き

### レイアウト構造
- `Layout.tsx`: サイドバー + メインコンテンツのフレックスレイアウト
  - デスクトップ（lg以上）: サイドバー常時表示
  - モバイル（lg未満）: ハンバーガーメニュー + スライドインサイドバー
- `Sidebar.tsx`: ナビゲーションメニュー + ログアウトボタン
  - メニュー項目: マッチング、ドラフトシミュレーション、ランキング、統計、マイページ

### 認証・ユーザー管理
- `src/features/auth/AuthContext.tsx`: 認証状態管理（Google OAuth）
- `src/features/auth/LoginPage.tsx`: ログインページ
- `src/features/auth/user.ts`: ユーザー関連Firestore操作
  - `ensureUserExists()`: 初回ユーザー作成
  - `completeOnboarding()`: オンボーディング完了処理
  - `getUserProfile()`: プロフィール取得
  - `updateDisplayName()`: 表示名更新
- `src/components/ProtectedRoute.tsx`: 認証・オンボーディング状態に基づくルート保護

### オンボーディング
- `src/features/onboarding/OnboardingPage.tsx`: 初回ユーザー名入力ページ
  - ゲーム内ユーザー名との一致を促す注意書き表示
  - 2-20文字のバリデーション

### マイページ
- `src/features/mypage/MyPage.tsx`: プロフィール編集ページ
  - 表示名の編集機能
  - ユーザー情報表示（アバター、メール）

### キュー・マッチング機能
- `src/features/queue/QueueContext.tsx`: キュー状態管理
  - `matchedMatchId`状態を追加（フェーズ1.3）
  - `bannedUntil`, `isBanned`, `remainingBanTime`状態を追加（通報機能）
  - `startQueue`でペナルティチェックを実施
- `src/features/queue/queue.ts`: キュー関連Firestore操作
  - `subscribeToQueueStatus`: `matched_match_id`と`banned_until`フィールド対応
  - `QueueData`型に`bannedUntil`フィールド追加
- `src/features/queue/components/QueueSection.tsx`: キューUIコンポーネント
  - ペナルティ中の警告表示と残り時間表示（通報機能）
  - ペナルティ中のボタン無効化

### マッチ機能（フェーズ1.3実装済み）
- `src/features/match/MatchResultPage.tsx`: マッチ成立画面（P1-03）
  - マッチID表示、ドラフトページへの遷移
  - `MatchContext`および`QueueContext`を使用

### Firebase
- `src/firebase.ts`: Firebase SDK初期化（Auth, Firestore）
- 開発環境ではエミュレータに接続

### Firebase Functions（バックエンド）
- `functions/src/index.ts`: Cloud Functions実装
  - **runMatchmaking**: 1分間隔の定期実行関数
    - 待機ユーザーから10人抽選してマッチ作成
    - トランザクションで競合回避
  - **runMatchmakingManual**: 手動実行用HTTP関数（開発・テスト用）
  - **onReportCreated**: 通報作成トリガー（通報機能）
    - `matches/{matchId}/reports`作成時に実行
    - 同一マッチ・同一被通報者の通報を集計
    - 異なる通報者から3件で自動ペナルティ付与
  - **applyPenalty**: ペナルティ付与ヘルパー関数
    - 3時間のインキュー制限を付与
    - `users.banned_until`更新と`penalties`サブコレクション作成
    - 冪等性確保（同一マッチへの重複ペナルティ防止）
  - 環境変数:
    - `MATCHING_MIN_QUEUE`: 最小キュー人数（デフォルト: 30）
    - `MATCHING_MAX_WAIT_SEC`: 最大待機時間秒（デフォルト: 180）
    - `MATCHING_CANDIDATE_LIMIT`: 候補取得上限（デフォルト: 50）

### スタイリング
- `src/index.css`: グローバルスタイル
  - CSS変数定義（--color-base, --color-surface, --color-accent-cyan等）
  - フォント設定（Rajdhani, DM Sans）

### 設定ファイル
- `vite.config.ts`: Vite設定（React plugin, Tailwind plugin）
- `biome.json`: Linter/Formatter設定
- `tsconfig.*.json`: TypeScript設定（app/node分離）
- `firebase.json`: Firebase Hosting設定（SPAリライトルール）

## Firestoreスキーマ

### usersコレクション
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `display_name` | string | 表示名（ゲーム内ユーザー名） |
| `photo_url` | string | プロフィール画像URL |
| `is_onboarded` | boolean | オンボーディング完了フラグ |
| `queue_status` | string \| null | "waiting" / "matched" / null |
| `queue_joined_at` | timestamp \| null | キュー参加時刻 |
| `matched_match_id` | string \| null | マッチID参照（フェーズ1.3実装済み） |
| `banned_until` | timestamp \| null | ペナルティ終了時刻（通報機能） |
| `created_at` | timestamp | 作成日時 |
| `updated_at` | timestamp | 更新日時 |

### users/{userId}/penaltiesサブコレクション（通報機能）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `match_id` | string | 通報元マッチID |
| `match_created_at` | timestamp | マッチ作成日時 |
| `reason` | string | "no_show"（ノーショー） |
| `penalty_duration_hours` | number | ペナルティ時間（時間単位） |
| `applied_at` | timestamp | ペナルティ付与日時 |
| `banned_until` | timestamp | ペナルティ終了時刻 |

### matchesコレクション（フェーズ1.3実装済み）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `phase` | string | "phase1"（フェーズ識別） |
| `source_type` | string | "auto"（自動マッチング） |
| `status` | string | "draft_pending"（ドラフト待機中） |
| `capacity` | number | 10（定員） |
| `auto_start` | boolean | true（自動開始フラグ） |
| `first_team` | string | "first" / "second"（先攻側チーム） |
| `created_at` | timestamp | 作成日時 |
| `updated_at` | timestamp | 更新日時 |

### matches/{matchId}/membersサブコレクション（フェーズ1.3実装済み）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `user_id` | string | ユーザーID |
| `role` | string | "participant"（参加者） |
| `team` | string | "first" / "second" |
| `seat_no` | number | 1-5（チーム内の座席番号） |
| `joined_at` | timestamp | 参加日時 |

### matches/{matchId}/reportsサブコレクション（通報機能）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `match_id` | string | マッチID |
| `reporter_user_id` | string | 通報者ユーザーID |
| `reported_user_id` | string | 被通報者ユーザーID |
| `reason` | string | "no_show"（ノーショー） |
| `match_created_at` | timestamp | マッチ作成日時 |
| `reported_at` | timestamp | 通報日時 |
| `screenshot_url` | string \| undefined | スクリーンショットURL（任意） |

## ビルド出力
- `dist/`: 本番用ビルド成果物（Firebase Hostingのpublic）
