# 通報機能・ペナルティシステム実装

## 実装完了日
2026-01-19

## 概要
未参加（ノーショー）ユーザーへの通報機能とペナルティシステムを実装。同一マッチ内で3件の通報が集まると、対象ユーザーに3時間のインキュー制限ペナルティが自動的に付与される。

## 機能詳細

### 通報機能
- **トリガー**: マッチ参加者が「REPORT」ボタンをクリック
- **対象**: 同一マッチ内の他の参加者
- **理由**: `"no_show"`（未参加・ノーショー）
- **保存先**: `matches/{matchId}/reports`サブコレクション
- **制約**:
  - 自己通報禁止
  - マッチ参加者のみ通報可能
  - 被通報者もマッチ参加者である必要あり

### ペナルティシステム
- **条件**: 同一マッチ内で異なる通報者から3件の通報
- **内容**: 3時間のインキュー制限
- **適用**: Firebase Functionsで自動付与
- **冪等性**: 同一マッチに対する重複ペナルティ防止
- **記録**: `users/{userId}/penalties`サブコレクションに履歴保存

### ペナルティ中の制限
- **UIでの表示**: 警告メッセージと残り時間表示
- **ボタン無効化**: 「FIND MATCH」ボタンが無効化され、ペナルティ中と表示
- **キュー参加制限**: `QueueContext.startQueue()`でエラーをスロー

## データ構造

### users/{userId}
- `banned_until` (timestamp | null): ペナルティ終了時刻
  - クライアントから変更禁止（Firestoreルールで保護）

### users/{userId}/penalties/{penaltyId}
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `match_id` | string | 通報元マッチID |
| `match_created_at` | timestamp | マッチ作成日時 |
| `reason` | string | "no_show" |
| `penalty_duration_hours` | number | 3（時間） |
| `applied_at` | timestamp | ペナルティ付与日時 |
| `banned_until` | timestamp | ペナルティ終了時刻 |

**アクセス権限**:
- 読み取り: 本人のみ
- 作成・更新・削除: バックエンドのみ

### matches/{matchId}/reports/{reportId}
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `match_id` | string | マッチID |
| `reporter_user_id` | string | 通報者ユーザーID |
| `reported_user_id` | string | 被通報者ユーザーID |
| `reason` | string | "no_show" |
| `match_created_at` | timestamp | マッチ作成日時 |
| `reported_at` | timestamp | 通報日時 |
| `screenshot_url` | string \| undefined | スクリーンショットURL（任意） |

**アクセス権限**:
- 読み取り: マッチ参加者のみ
- 作成: マッチ参加者のみ、自己通報禁止
- 更新・削除: 禁止

## 実装ファイル

### バックエンド
- **functions/src/index.ts**
  - `onReportCreated`: Firestoreトリガー（`matches/{matchId}/reports/{reportId}`作成時）
    - 同一マッチ・同一被通報者の通報を集計
    - 異なる通報者から3件で`applyPenalty()`を呼び出し
  - `applyPenalty(userId, matchId, matchCreatedAt)`: ペナルティ付与ヘルパー関数
    - トランザクションで以下を実行:
      1. 既存ペナルティ確認（同一マッチへの重複防止）
      2. `users.banned_until`を更新（既存より後の場合のみ）
      3. `penalties`サブコレクションに履歴追加

### フロントエンド
- **src/features/draft/match.ts**
  - `createReport()`: 通報作成関数
    - 保存先を`matches/{matchId}/reports`に変更
    - `reason`を`"no_show"`に変更

- **src/features/queue/queue.ts**
  - `QueueData`型に`bannedUntil: Date | null`を追加
  - `subscribeToQueueStatus()`で`banned_until`を取得

- **src/features/queue/QueueContext.tsx**
  - `QueueContextType`に以下を追加:
    - `bannedUntil: Date | null`
    - `isBanned: boolean`
    - `remainingBanTime: number | null`（ミリ秒）
  - `startQueue()`でペナルティチェックを追加（ペナルティ中はエラー）

- **src/features/queue/components/QueueSection.tsx**
  - ペナルティ中の警告UI表示
    - 残り時間を表示（例: 「2時間30分」）
    - ボタン無効化とボーダー色を赤に変更

### Firestoreルール
- **firestore.rules**
  - `users.banned_until`をクライアントから変更禁止に設定
  - `users/{userId}/penalties`サブコレクション追加（読み取り: 本人のみ、作成・更新・削除: バックエンドのみ）
  - ルートレベルの`reports`コレクション削除
  - `matches/{matchId}/reports`サブコレクション追加（マッチ参加者のみアクセス可能）

## 処理フロー

### 通報からペナルティ付与まで
1. ユーザーAがマッチ画面で「REPORT」ボタンをクリック
2. 通報モーダルでユーザーBを選択して通報作成
3. `createReport()`で`matches/{matchId}/reports`に保存
4. **Firebase Functions `onReportCreated`トリガー発火**
5. 同一マッチ・同一被通報者（ユーザーB）の通報を集計
6. 異なる通報者から3件目の通報 → `applyPenalty()`を呼び出し
7. トランザクションで以下を実行:
   - `users/{userB}/penalties`に履歴追加
   - `users/{userB}.banned_until`を更新（3時間後）
8. フロントエンドの`subscribeToQueueStatus()`で`banned_until`を検知
9. `QueueContext`で`isBanned = true`に更新
10. UI上でペナルティ警告を表示、マッチングボタンを無効化

### ペナルティ中のキュー参加試行
1. ペナルティ中のユーザーがマッチング開始ボタンをクリック
2. `QueueContext.startQueue()`が呼ばれる
3. `isBanned`チェック → エラーをスロー: 「ペナルティ中のため、マッチングに参加できません」
4. エラーハンドリング（UIでエラー表示）

## テスト方法（エミュレータ）

### 準備
1. `firebase emulators:start`でエミュレータ起動
2. `pnpm dev`でフロントエンド起動

### シナリオ1: 通報作成
1. マッチに参加
2. 通報ボタンをクリック
3. Firestore UI（http://localhost:4000/firestore）で`matches/{matchId}/reports`に保存確認

### シナリオ2: ペナルティ付与
1. 同一ユーザーに対して3人から通報
2. Firestore UIで以下を確認:
   - `users/{userId}/penalties`サブコレクション作成
   - `users/{userId}.banned_until`が3時間後に更新

### シナリオ3: インキュー制限
1. ペナルティ中のユーザーでログイン
2. マッチング開始ボタンが無効化されていること確認
3. ペナルティ警告メッセージと残り時間が表示されること確認

### シナリオ4: 冪等性
1. 同一マッチで4件目の通報を作成
2. ペナルティが二重作成されないこと確認
3. Functions logsで「penalty already exists」ログ確認

## 受け入れ条件
- ✅ マッチ参加者が通報ボタンから通報作成できる
- ✅ 同一マッチ内で3件の通報でペナルティが自動付与される
- ✅ ペナルティ中のユーザーはマッチングに参加できない
- ✅ ペナルティ中のUIが正しく表示される
- ✅ 冪等性が確保され、重複ペナルティが発生しない

## 今後の拡張案
- ペナルティ履歴の表示（マイページ等）
- 通報の取り消し機能
- 管理者による手動ペナルティ解除
- 繰り返し違反者への累進的ペナルティ（3時間 → 6時間 → 24時間等）
- 通報理由の多様化（暴言、不正行為等）
