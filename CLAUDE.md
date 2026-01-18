# CLAUDE.md - ユナメイト開発ガイド

このファイルは、ユナメイト（unitemate-v2）プロジェクトでClaude Codeが作業する際の指針を示します。

## プロジェクト概要

**ユナメイト（unitemate-v2）** は、ポケモンユナイトのドラフトピック形式のマッチを提供するWebアプリケーションです。

### 主要機能
- **マッチング**: 10人（5vs5）のプレイヤーをマッチング
- **ドラフト**: BAN/PICK形式でポケモンを選択（3BAN制、各BAN/PICK 15秒制限）
- **ロビー共有**: ホストがロビーIDを入力し、全員がゲーム内で参加
- **試合実施**: アプリ外（ゲーム内）で実際の試合を行う

### 現在のフェーズ
- **フェーズ1.3（✅ 完了）**: マッチ成立とチーム分け（10人でマッチ成立、Firebase Functionsによる自動マッチング）
- **次のフェーズ**: ドラフト機能の実装

## 重要な制約と方針

### トークン節約のためのSerena MCP活用（最優先）

**CRITICAL**: コード理解には、必ずSerena MCPツールを使用してください。`Read`ツールでファイル全体を読むのは最後の手段です。

#### 推奨アプローチ

1. **シンボルの概要取得**: まず`get_symbols_overview`で構造を把握
   ```
   mcp__serena__get_symbols_overview(relative_path="src/features/auth/AuthContext.tsx", depth=1)
   ```

2. **シンボルの検索**: 特定のシンボルを探す場合は`find_symbol`
   ```
   mcp__serena__find_symbol(name_path_pattern="QueueContext", relative_path="src/features/queue")
   ```

3. **パターン検索**: 特定のパターンを探す場合は`search_for_pattern`
   ```
   mcp__serena__search_for_pattern(substring_pattern="Context\.Provider", relative_path="src/features")
   ```

4. **ファイル全体読み込み**: 上記で十分な情報が得られない場合のみ`Read`を使用

#### NG例
```
# ❌ 悪い例: いきなりファイル全体を読む
Read(file_path="src/features/auth/AuthContext.tsx")

# ✅ 良い例: まずシンボル概要を取得
get_symbols_overview(relative_path="src/features/auth/AuthContext.tsx", depth=1)
# 必要なシンボルのみ詳細取得
find_symbol(name_path_pattern="AuthContext", include_body=true)
```

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

```typescript
import { serverTimestamp } from "firebase/firestore";

await updateDoc(userRef, {
  queue_status: "waiting",
  queue_joined_at: serverTimestamp(), // ✅ 正しい
  // queue_joined_at: new Date(), // ❌ クライアントのタイムスタンプは使わない
});
```

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

#### 既存のContext
- **AuthContext**: 認証状態（user, loading, login, logout）
- **QueueContext**: キュー状態（queueStatus, matchedMatchId, joinQueue, leaveQueue）
- **MatchContext**: マッチ状態（match, members, setCurrentMatchId）

#### Contextの実装パターン

```typescript
// 1. Context型定義
interface XxxContextType {
  state: SomeState;
  action: () => void;
}

// 2. Context作成（初期値はnull）
const XxxContext = createContext<XxxContextType | null>(null);

// 3. Providerコンポーネント
export function XxxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SomeState>(initialState);

  // Firestoreリアルタイム購読などの副作用
  useEffect(() => {
    const unsubscribe = onSnapshot(/* ... */);
    return () => unsubscribe();
  }, []);

  return (
    <XxxContext.Provider value={{ state, action }}>
      {children}
    </XxxContext.Provider>
  );
}

// 4. カスタムフック
export function useXxx() {
  const context = useContext(XxxContext);
  if (!context) {
    throw new Error("useXxx must be used within XxxProvider");
  }
  return context;
}
```

### ページコンポーネントとLayout

#### Layoutの使用
- **認証済みページ**: `Layout`コンポーネントでラップ（サイドバー付き）
- **認証前ページ**: Layoutなし（LoginPage, OnboardingPage）

#### App.tsxでのルーティング例
```tsx
<Route path="/" element={<Layout><HomePage /></Layout>} />
<Route path="/login" element={<LoginPage />} />
```

### ファイル命名規則

- **コンポーネント**: PascalCase（例: `ProtectedRoute.tsx`, `LoginPage.tsx`）
- **ユーティリティ**: camelCase（例: `user.ts`, `queue.ts`, `firebase.ts`）
- **スタイル**: kebab-case（例: `index.css`）

## コーディング規約

### TypeScript

- **Strictモード**: 有効
- **型ヒント**: 必須（関数引数、戻り値、変数に明示的に型を付ける）
- **未使用変数**: 禁止
- **未使用パラメータ**: 禁止

```typescript
// ✅ 良い例
function getUserProfile(userId: string): Promise<UserProfile> {
  // ...
}

// ❌ 悪い例
function getUserProfile(userId) {  // 型が不明
  // ...
}
```

### Biome設定

- **インデント**: タブ
- **クオート**: ダブルクォート（"）
- **インポート整理**: 自動（保存時に自動整理される）

### Firestore操作のパターン

#### データ取得
```typescript
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const userRef = doc(db, "users", userId);
const userSnap = await getDoc(userRef);
if (userSnap.exists()) {
  const data = userSnap.data();
  // ...
}
```

#### データ更新
```typescript
import { updateDoc, serverTimestamp } from "firebase/firestore";

await updateDoc(userRef, {
  display_name: newName,
  updated_at: serverTimestamp(),
});
```

#### リアルタイム購読
```typescript
import { onSnapshot } from "firebase/firestore";

const unsubscribe = onSnapshot(docRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    // 状態更新
  }
});

// クリーンアップ
return () => unsubscribe();
```

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

#### 使用例
```tsx
<div
  className="p-6 rounded-lg"
  style={{ backgroundColor: "var(--color-surface)" }}
>
  <h1 style={{ color: "var(--color-accent-cyan)" }}>Title</h1>
</div>
```

## データモデル

プロジェクトのデータベース設計の詳細は `docs/db_spec.md` を参照してください。以下は主要なコレクションの概要です。

### users コレクション
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `display_name` | string | 表示名（ゲーム内ユーザー名） |
| `email` | string | メールアドレス |
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
- **要件確認**: `docs/serveice_requirements.md` で機能要件を確認
- **データ設計**: `docs/db_spec.md` でFirestoreスキーマを確認
- **実装計画**: `docs/開発計画書/` で詳細な実装計画を確認

#### Serenaメモリ（.serena/memory/）
- `project_overview` - プロジェクト概要
- `codebase_structure` - コードベース構造
- `tech_stack` - 技術スタック
- `code_style_and_conventions` - コードスタイル
- `phase1-3_implementation_plan` - フェーズ1.3実装計画

```typescript
// メモリを読んで既存実装を理解
mcp__serena__read_memory(memory_file_name="phase1-3_implementation_plan")

// データベース設計書を参照
Read(file_path="docs/db_spec.md")
```

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

### 5. エラーハンドリング

Firestore操作では、必ずエラーハンドリングを実装してください。

```typescript
try {
  await updateDoc(userRef, data);
} catch (error) {
  console.error("Failed to update user:", error);
  // ユーザーにエラーメッセージを表示
}
```

## デバッグとテスト

### ローカル開発

```bash
# 開発サーバー起動
pnpm dev

# Firebaseエミュレータ起動（別ターミナル）
firebase emulators:start

# Functions開発（別ターミナル）
cd functions
pnpm dev
```

### ビルドとデプロイ

```bash
# ビルド
pnpm build

# Hostingのプレビュー
pnpm preview

# Firebaseデプロイ
firebase deploy
```

## 参考リソース

### ドキュメント（docs/）
- **要件定義書**: `docs/serveice_requirements.md` - プロジェクト全体の要件定義
- **データベース設計書**: `docs/db_spec.md` - Firestoreコレクション構造の詳細
- **開発ガイド**: `docs/development_guide.md` - 開発プロセスのガイドライン
- **開発計画書**:
  - `docs/開発計画書/ドラフトピック機能実装計画.md` - ドラフト機能の実装計画
  - `docs/開発計画書/ドラフトピック機能設計書.md` - ドラフト機能の設計仕様

### Serenaメモリ（.serena/memory/）
実装前に必ず関連するメモリファイルを確認してください。
- `project_overview.md` - プロジェクト概要
- `codebase_structure.md` - コードベース構造
- `tech_stack.md` - 技術スタック
- `code_style_and_conventions.md` - コードスタイル
- `phase1-3_implementation_plan.md` - フェーズ1.3実装計画

## 重要な原則

1. **トークン節約**: Serena MCPツールを最大限活用し、ファイル全体読み込みを避ける
2. **ドキュメント参照**: 実装前に `docs/serveice_requirements.md`（要件定義）と `docs/db_spec.md`（データベース設計）を確認
3. **型安全性**: TypeScriptの型を明示的に付け、型エラーを防ぐ
4. **セキュリティ**: Firestoreルールを遵守し、クライアント側の制約を理解する
5. **一貫性**: 既存のパターンに従い、コードスタイルを統一する
