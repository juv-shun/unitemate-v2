# CLAUDE.md - ユナメイト開発ガイド

このファイルは、ユナメイト（unitemate-v2）プロジェクトでClaude Codeが作業する際の指針を示します。

## プロジェクト概要

**ユナメイト（unitemate-v2）** は、ポケモンユナイトのドラフトピック形式のマッチを提供するWebアプリケーションです。

### 主要機能
- **マッチング**: 10人（5vs5）のプレイヤーをマッチング
- **ドラフト**: BAN/PICK形式でポケモンを選択（3BAN制、各BAN/PICK 15秒制限）
- **ロビー共有**: ホストがロビーIDを入力し、全員がゲーム内で参加
- **試合実施**: アプリ外（ゲーム内）で実際の試合を行う

## 重要な制約と方針

### トークン節約のためのSerena MCP活用（最優先）

**CRITICAL**: コード理解には、必ずSerena MCPツールを使用してください。`Read`ツールでファイル全体を読むのは最後の手段です。

### Firestoreセキュリティルール制約

#### クライアント側の制約
- **users.queue_status**: `"waiting"` と `null` のみクライアントから変更可能。`"matched"` への変更は**バックエンドのみ**
- **users.matched_match_id**: クライアントから変更**禁止**（常に`null`を設定）
- **matches**: 読み取りは可能だが、作成・更新は限定的
  - 作成: `status == "waiting"` の場合のみ（手動作成ドラフト用）
  - 更新: `waiting -> draft_pending` の遷移のみ
- **matches/{matchId}/members**: 自分自身のドキュメントのみ作成・更新・削除可能

#### バックエンドの責務
- **自動マッチング**: Firebase Functionsで実行（1分間隔）
- **マッチ成立**: `queue_status="matched"`, `matched_match_id={matchId}` への更新
- **matches作成**: 自動マッチング時の`status="draft_pending"`でのマッチ作成

### Firebase設定

#### エミュレータ使用
- 開発環境では、Auth/Firestoreエミュレータに自動接続
- `firebase.ts`で環境変数`NODE_ENV`を確認し、エミュレータの有無を判定

#### serverTimestampの使用
- Firestoreへのデータ保存時は、**必ず**`serverTimestamp()`を使用
- `created_at`, `updated_at`, `joined_at`, `queue_joined_at`などのタイムスタンプフィールドに適用

#### Callable Functions の Cloud Run IAM 設定（重要）

新しい **Callable Function（`onCall`）** を追加した場合、本番環境で動作させるには **Cloud Run の IAM 設定を手動で変更する必要があります**。

**背景**: Cloud Functions v2 (2nd gen) の Callable Functions は、デフォルトで Cloud Run の IAM 認証が有効になっています。Firebase Auth のトークンは Cloud IAM とは別物のため、「公開アクセスを許可」に設定しないとクライアントからの呼び出しが拒否されます。

**設定手順**:
1. [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run?project=unitemate-v2) にアクセス
2. 対象の Callable Function（例: `setseated`）を選択
3. 「セキュリティ」タブで「認証」を「**公開アクセスを許可する**」に変更
4. 保存

**対象となる関数**: クライアント（ブラウザ）から `httpsCallable` で呼び出す関数のみ。スケジュール実行（`onSchedule`）やFirestoreトリガー（`onDocumentCreated`）は対象外。

**セキュリティについて**: 関数内部で `request.auth` をチェックしているため、Firebase Auth でログインしていないユーザーは引き続き拒否されます。「公開アクセス」は Cloud Run レベルの認証をスキップするだけで、アプリケーションレベルのセキュリティは維持されています。


## アーキテクチャとパターン

### ディレクトリ構造

```
src/
├── components/         # 再利用可能なコンポーネント（Layout, Sidebar, ProtectedRoute）
├── features/           # 機能別モジュール（フィーチャー駆動設計）
│   ├── auth/           # 認証機能（AuthContext, LoginPage, user.ts）
│   ├── draft/          # ドラフト・マッチ機能
│   ├── match/          # マッチ成立画面
│   ├── mypage/         # マイページ
│   ├── onboarding/     # オンボーディング
│   ├── profile/        # プロフィール（HomePage）
│   ├── queue/          # キュー・マッチング
│   ├── ranking/        # ランキング（未実装）
│   └── stats/          # 統計（未実装）
├── assets/             # 静的アセット
├── App.tsx             # ルートコンポーネント（ルーティング設定）
├── main.tsx            # エントリポイント
├── firebase.ts         # Firebase初期化
└── index.css           # グローバルスタイル（CSS変数定義）
```

### Context駆動の状態管理

プロジェクトでは、各機能ごとにReact Contextで状態管理を行います。

- **AuthContext**: 認証状態（user, loading, login, logout）
- **QueueContext**: キュー状態（queueStatus, matchedMatchId, joinQueue, leaveQueue）
- **MatchContext**: マッチ状態（match, members, setCurrentMatchId）


### ページコンポーネントとLayout

- **認証済みページ**: `Layout`コンポーネントでラップ（サイドバー付き）
- **認証前ページ**: Layoutなし（LoginPage, OnboardingPage）


### ファイル命名規則

- **コンポーネント**: PascalCase（例: `ProtectedRoute.tsx`, `LoginPage.tsx`）
- **ユーティリティ**: camelCase（例: `user.ts`, `queue.ts`, `firebase.ts`）
- **スタイル**: kebab-case（例: `index.css`）


### Tailwind CSS + CSS変数

プロジェクトでは、Tailwind CSSとCSS変数を併用しています。

#### CSS変数（index.cssで定義）
```css
:root {
  --color-base: #0f172a;              /* 背景色 */
  --color-surface: #1e293b;           /* カード背景 */
  --color-accent-cyan: #06b6d4;       /* アクセントカラー（シアン） */
  --color-accent-pink: #ec4899;       /* アクセントカラー（ピンク） */
  --color-text-primary: #f1f5f9;      /* 主テキスト */
  --color-text-secondary: #cbd5e1;    /* 副テキスト */
  --color-danger: #ef4444;            /* 危険色 */
  --font-display: "Rajdhani", sans-serif;  /* 見出しフォント */
  --font-body: "DM Sans", sans-serif;      /* 本文フォント */
}
```

## データモデル

プロジェクトのデータベース設計の詳細は `docs/db_spec.md` を参照してください。以下は主要なコレクションの概要です。

### users コレクション
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `display_name` | string | 表示名（ゲーム内ユーザー名） |
| `photo_url` | string | プロフィール画像URL |
| `is_onboarded` | boolean | オンボーディング完了フラグ |
| `queue_status` | string \| null | "waiting" / "matched" / null |
| `queue_joined_at` | timestamp \| null | キュー参加時刻 |
| `matched_match_id` | string \| null | マッチID参照 |
| `created_at` | timestamp | 作成日時 |
| `updated_at` | timestamp | 更新日時 |

### matches コレクション
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

### matches/{matchId}/members サブコレクション
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `user_id` | string | ユーザーID |
| `role` | string | "participant"（参加者） |
| `team` | string | "first" / "second" |
| `seat_no` | number | 1-5（チーム内の座席番号） |
| `joined_at` | timestamp | 参加日時 |

## 実装時の注意事項

### 1. ドキュメントとメモリの活用

実装前に必ず関連するドキュメントとメモリを読んで、コンテキストを理解してください。

#### プロジェクトドキュメント（docs/）
- **要件確認**: `docs/requirements/overview.md` で機能要件を確認
- **データ設計**: `docs/db_spec.md` でFirestoreスキーマを確認

#### Serenaメモリ（.serena/memory/）
- `project_overview` - プロジェクト概要
- `codebase_structure` - コードベース構造
- `tech_stack` - 技術スタック
- `code_style_and_conventions` - コードスタイル
- `phase1-3_implementation_plan` - フェーズ1.3実装計画

### 2. コード理解の順序

新しい機能を実装する際は、以下の順序で理解を深めてください。

1. **メモリを読む**: 関連するSerenaメモリを読んで、既存実装を理解
2. **シンボル概要を取得**: `get_symbols_overview`で構造把握
3. **シンボル検索**: `find_symbol`で必要なシンボルを探す
4. **パターン検索**: `search_for_pattern`で特定のパターンを探す
5. **ファイル読み込み**: 最後の手段として`Read`でファイル全体を読む

### 3. 新しいContextの追加

新しい機能でContextが必要な場合は、以下のパターンに従ってください。

1. `src/features/{feature}/XxxContext.tsx`を作成
2. Context型定義、Context作成、Provider、カスタムフックを実装
3. `App.tsx`でProviderをラップ
4. 必要なコンポーネントで`useXxx()`フックを使用

### 4. Firestoreルールの確認

Firestore操作を実装する際は、必ず`firestore.rules`を確認してください。クライアント側の制約を理解していないと、セキュリティルールでブロックされます。

## 重要な原則

1. **トークン節約**: Serena MCPツールを最大限活用し、ファイル全体読み込みを避ける
2. **ドキュメント参照**: 実装前に `docs/requirements/overview.md`（要件定義）と `docs/db_spec.md`（データベース設計）を確認
3. **セキュリティ**: Firestoreルールを遵守し、クライアント側の制約を理解する
4. **一貫性**: 既存のパターンに従い、コードスタイルを統一する
