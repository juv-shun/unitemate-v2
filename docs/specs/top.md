# トップページ仕様（インキュー/ステータス）

## 目的
- インキュー開始/停止と待機状況の表示を行う
- マッチ成立後の導線を提供する

## 対象URL
- `/`
  - 関連ファイル: `src/App.tsx`, `src/features/profile/HomePage.tsx`

## アクセス条件
- ログイン有無に関わらずアクセス可能
- ログインしていない場合はインキュー不可（ボタン無効化）
  - 関連ファイル: `src/App.tsx`, `src/features/profile/HomePage.tsx`, `src/features/queue/components/QueueSection.tsx`

## 表示構成（概要）
- 待機ステータス表示
- インキュー開始/キャンセル
- インキュー不可時の理由表示（受付時間外/ペナルティ）
  - 関連ファイル: `src/features/profile/HomePage.tsx`, `src/features/queue/components/QueueSection.tsx`

## インキュー可否判定
### 1) ログイン
- 未ログイン時はインキュー不可
- CTA表示文言は「LOGIN REQUIRED」
  - 関連ファイル: `src/features/queue/components/QueueSection.tsx`

### 2) 受付時間
- 受付時間は 20:00〜23:00
- 23:00ちょうどは受付不可（20:00〜22:59:59 が可）
- クライアント判定は端末のローカル時刻で行う
  - 関連ファイル: `src/features/queue/queue.ts`, `src/features/queue/components/QueueSection.tsx`, `src/features/queue/QueueContext.tsx`

### 3) ペナルティ
- `users.banned_until` が有効な間はインキュー不可
- 残り時間を表示
  - 関連ファイル: `src/features/queue/QueueContext.tsx`, `src/features/queue/components/QueueSection.tsx`, `functions/src/report/index.ts`

## 表示状態
### 通常（未参加）
- 「FIND MATCH」ボタンを表示
  - 関連ファイル: `src/features/queue/components/QueueSection.tsx`

### 待機中（queue_status == "waiting"）
- 経過時間を秒表示
- キャンセルボタンを表示
- 待機中でも他ページへ遷移可能
  - 関連ファイル: `src/features/queue/components/QueueSection.tsx`, `src/features/queue/QueueContext.tsx`

### 受付時間外
- 受付不可メッセージ: 「20:00〜23:00 以外はマッチングを受け付けていません」
  - 関連ファイル: `src/features/queue/components/QueueSection.tsx`, `src/features/queue/queue.ts`

### ペナルティ中
- 受付不可メッセージと残り時間を表示
  - 関連ファイル: `src/features/queue/components/QueueSection.tsx`, `src/features/queue/QueueContext.tsx`

## マッチ成立時の強制遷移/表示
- マッチ成立（`queue_status == "matched"`）時、現在ページに関わらず `/lobby/:matchId` に強制遷移
- ロビー内で未着席の場合は確認モーダルを表示
  - 関連ファイル: `src/features/queue/QueueContext.tsx`, `src/App.tsx`, `src/features/draft/DraftSimulationPage.tsx`, `src/features/draft/components/MatchLobby.tsx`

## マッチング発生タイミング（バックエンド）
- スケジュール: 1分ごと
- 候補: `users.queue_status == "waiting"` を `queue_joined_at` 昇順で最大 `MATCHING_CANDIDATE_LIMIT` 件（デフォルト 200）
- 実行条件:
  - 待機人数が10人未満なら実行しない
  - 待機人数が `MATCHING_MIN_QUEUE` 以上なら実行（デフォルト 30）
  - それ以外は、最古の `queue_joined_at` からの経過が `MATCHING_MAX_WAIT_SEC` 以上（デフォルト 60秒）で実行
  - 関連ファイル: `functions/src/matchmaking/index.ts`

## マッチングメンバー選定アルゴリズム
1. 最古の最大10人を保護（必ず除外されない）
2. 残り候補をFisher-Yatesでシャッフル
3. 保護+シャッフル後、10人単位にならない余りは末尾から除外（新しいユーザーから除外）
4. 残った候補をレート降順でソート
5. 10人ずつマッチを作成
  - 関連ファイル: `functions/src/matchmaking/index.ts`

## チーム割当
- 10人をレート降順で並べ、以下の順でチーム割当
  - first, second, second, first, first, second, second, first, first, second
- 座席番号はチーム内の順番（1〜5）
- 先攻/後攻（`first_team`）は50%ランダム
  - 関連ファイル: `functions/src/matchmaking/index.ts`

## マッチ作成時の更新
- `matches` を作成
  - `phase: "phase3"`
  - `source_type: "auto"`
  - `status: "lobby_pending"`
  - `capacity: 10`
  - `auto_start: true`
- `matches/{matchId}/members` を作成
  - `role: "participant"`, `team`, `seat_no`, `joined_at`
- `users` を更新
  - `queue_status: "matched"`
  - `queue_joined_at: null`
  - `matched_match_id: matchId`
  - 関連ファイル: `functions/src/matchmaking/index.ts`

## 23:00 自動リセット
- 毎日 23:00（JST）に `queue_status == "waiting"` を自動リセット
- 対象ユーザーは `queue_status: null`, `queue_joined_at: null`, `matched_match_id: null` に更新
  - 関連ファイル: `functions/src/matchmaking/index.ts`

## 備考
- 受付時間判定はクライアントのローカル時刻、リセットはJST固定のためズレる可能性あり
