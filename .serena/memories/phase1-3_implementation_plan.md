# フェーズ1.3 実装状況（マッチ成立：ランダム10人）

## 実装完了日
2026-01-18（codexにより実装）

## 概要
- **目的**: 待機ユーザー10人でマッチを成立させ、チーム分け（5人ずつ）と先攻/後攻を決定して表示する
- **参照**: `docs/開発計画書/開発計画_フェーズ1.md` フェーズ1.3、`docs/要件定義書.md` 8.1、`docs/画面設計書_フェーズ1.md` P1-03
- **ステータス**: ✅ 実装完了

## データ設計

### 既存利用（usersコレクション）
- `queue_status`: "waiting" / "matched" / null
- `queue_joined_at`: timestamp
- **追加**: `matched_match_id`（string）- マッチID参照用

### 新規利用（matchesコレクション）

#### matches/{matchId}
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `source_type` | string | "auto"（自動マッチング） |
| `status` | string | "draft_pending"（ドラフト待機中） |
| `first_team` | string | "first" / "second"（先攻側チーム） |
| `created_at` | timestamp | 作成日時 |
| `updated_at` | timestamp | 更新日時 |

#### matches/{matchId}/members/{memberId}
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `user_id` | string | ユーザーID |
| `role` | string | "participant"（参加者） |
| `team` | string | "first" / "second" |
| `seat_no` | number | 1-5（チーム内の座席番号） |
| `joined_at` | timestamp | 参加日時 |

## マッチング方式

### トリガー
**バックエンド（Firebase Functions - TypeScript）採用**
- 定期実行 or Firestore変更検知でマッチング処理を実行
- トランザクションで競合・二重成立を回避

### マッチング実行条件（環境変数で設定可能）
- `MATCHING_MIN_QUEUE`: 最小キュー人数（デフォルト: 30人）
- `MATCHING_MAX_WAIT_SEC`: 最大待機時間（デフォルト: 180秒）

### 抽選ロジック（A案採用）
1. `queue_status == "waiting"` のユーザーを `queue_joined_at` 昇順で最大N件（30-50程度）取得
2. 取得したユーザーをシャッフルして10人選出
3. 10人未満なら終了

## 実装タスク

### バックエンド（マッチング処理）
1. **待機ユーザー取得**: `queue_status == "waiting"` を `queue_joined_at` 昇順で取得
2. **抽選**: 配列をシャッフルして10人確定（10人未満なら終了）
3. **チーム分け**: 10人を再シャッフル → 先頭5人を `team: "first"`、後半5人を `team: "second"`
4. **先攻/後攻決定**: ランダムで `first_team` を "first" / "second" に決定
5. **Firestoreトランザクション**:
   - `matches` 新規作成
   - `matches/{matchId}/members` 10件作成
   - `users` の `queue_status="matched"`, `matched_match_id=matchId` へ更新
   - `queue_status != "waiting"` のユーザーが含まれる場合は中断（再抽選）

### フロント（マッチ成立の検知）
1. **ユーザードキュメント監視**: 既存の `subscribeToQueueStatus` に `matched_match_id` を追加
2. **遷移ルール**: `queue_status === "matched"` かつ `matched_match_id` が存在 → P1-03へ遷移
3. **セッション復帰**: リロード時も `matched_match_id` を参照しP1-03へ復帰

### フロント（P1-03 マッチ成立画面）
1. **データ取得**:
   - `matches/{matchId}` の購読
   - `matches/{matchId}/members` の購読（participantのみ）
2. **表示内容**:
   - `first_team` に基づく先攻/後攻表示
   - チームごとのユーザー名一覧（`seat_no` 順）
3. **UI状態**:
   - 取得中: ローディング
   - データ欠損: エラーメッセージ（P1-08への導線）
4. **次フェーズ導線**: 「ドラフト開始」ボタン（フェーズ1.4で有効化）

### Firestoreルール
- `users.queue_status` / `matched_match_id` の更新は **バックエンドのみ** に制限
- `matches` と `members` の作成も **バックエンドのみ** に制限
- 参加者は `matches/{matchId}` と `members` を読み取り可能

## 画面遷移と状態

1. P1-02（ホーム）でインキュー開始
2. `queue_status: "waiting"` → 10人成立で `queue_status: "matched"`
3. P1-03へ遷移し、チームと先攻/後攻を表示

## 例外・エッジケース

- **二重マッチ成立**: トランザクションで `queue_status` を検証し回避
- **取得中にキャンセル**: 既に `queue_status` が変わっていれば再抽選
- **不整合検知**: `members` が10人未満ならP1-08へ誘導
- **再読み込み**: `matched_match_id` から復元

## 実装成果物

### バックエンド（Firebase Functions）
- **[functions/src/index.ts](functions/src/index.ts)** - マッチング処理の実装
  - `runMatchmaking`: 1分間隔の定期実行関数（onSchedule）
  - `runMatchmakingManual`: 手動実行用HTTP関数（開発・テスト用）
  - 環境変数対応:
    - `MATCHING_MIN_QUEUE`: 最小キュー人数（デフォルト: 30）
    - `MATCHING_MAX_WAIT_SEC`: 最大待機時間（デフォルト: 180秒）
    - `MATCHING_CANDIDATE_LIMIT`: 候補取得上限（デフォルト: 50）
  - トランザクションによる競合回避実装済み

### フロントエンド
- **[src/features/match/MatchResultPage.tsx](src/features/match/MatchResultPage.tsx)** - マッチ成立画面（P1-03）
  - マッチID表示
  - ドラフトページへの遷移ボタン
  - エラー・ローディング状態の処理
- **[src/features/draft/MatchContext.tsx](src/features/draft/MatchContext.tsx)** - マッチ状態管理
  - `setCurrentMatchId`: マッチIDの設定
  - `subscribeToMatch`: マッチ情報のリアルタイム購読
  - `subscribeToMembers`: メンバー情報のリアルタイム購読
- **[src/features/queue/queue.ts](src/features/queue/queue.ts)** - キュー操作（拡張）
  - `subscribeToQueueStatus`: `matched_match_id` フィールド対応済み
- **[src/App.tsx](src/App.tsx)** - ルーティング追加
  - `/match/:matchId?`: マッチ成立画面のルート追加

### 受け入れ条件
- ✅ 10人分のユーザーが待機中の状態で、マッチが成立する
- ✅ 成立後、チーム分け（5人ずつ）が画面に表示される
- ✅ 先攻/後攻が表示される

### 手動確認チェックリスト
- ✅ 10人インキュー後に `queue_status` が `matched` に変わる
- ✅ `matches/{matchId}` が作成されている
- ✅ `members` が10人分あり、5人ずつに分かれている
- ✅ P1-03に遷移し、チーム/先攻後攻が表示される
- ✅ リロードしてもP1-03に復帰する
