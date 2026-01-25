# V-Arena DB設計書


## 1. 前提・設計方針

- Firebase（Cloud Firestore）を前提とする。
- 主要キーはドキュメントID（UUID相当）を使用する。
- 変更履歴や集計に必要な「イベント性の高い情報」はサブコレクションで履歴化する。
- 参照整合性はアプリ側で担保する（FirestoreはFK制約を持たない）。
- Firestoreへのデータ保存時は、**必ず**`serverTimestamp()`を使用（`created_at`, `updated_at`等）。

---

## 2. データ構造概要（コレクション）

- users（ユーザー）
  - rating_changes（サブコレクション）
  - penalties（サブコレクション）
  - notifications（サブコレクション）
  - pick_histories（サブコレクション）
- matches（試合/ルーム）
  - members（サブコレクション）
  - reports（サブコレクション）
  - result_votes（サブコレクション）
  - match_results（サブコレクション）

---

## 3. コレクション定義

### 3.1 users
ユーザー基本情報。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| display_name | string | 表示名 |
| photo_url | string | プロフィール画像URL |
| is_onboarded | boolean | 初期ユーザー名のセットアップ完了フラグ |
| rating | number | レート（初期値: 1600） |
| total_matches | number | 試合数（結果確定済みのみ） |
| total_wins | number | 勝利数（結果確定済みのみ） |
| recent_results | array | 直近20試合の結果（結果確定済みのみ） |
| queue_status | string \| null | キュー状態 (waiting / matched / null) |
| queue_joined_at | timestamp \| null | キュー参加時刻 |
| matched_match_id | string \| null | マッチ成立時の試合ID |
| banned_until | timestamp \| null | ペナルティによるインキュー禁止期限 |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

インデックス:
- queue_status + queue_joined_at
- rating(desc) + total_matches(desc)

セキュリティルール:
- **queue_status**: クライアントは`"waiting"`と`null`のみ変更可能。`"matched"`への変更はバックエンドのみ
- **matched_match_id**: クライアントから変更禁止（常に`null`を設定）

recent_results 要素:
- match_id: string
- result: win / loss / invalid
- matched_at: timestamp（マッチング時刻）
- rating_delta: number（レート変動値）

---



### 3.2 matches
試合単位のデータ。手動ルーム作成と自動マッチングの両方に利用。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| phase | string | phase1 / phase2 / phase3 |
| source_type | string | manual / auto |
| status | string | waiting / lobby_pending / completed |
| capacity | number | 10固定 |
| auto_start | boolean | true固定 |
| first_team | string | first / second |
| lobby_id | string | ロビーID（8桁数字、先頭0許可、後勝ち上書き） |
| lobby_updated_at | timestamp | ロビーID更新時刻 |
| final_result | string | first_win / second_win / invalid |
| finalized_at | timestamp | 結果確定時刻 |
| finalized_reason | string | threshold / timeout |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

補足: フェーズ1の自動マッチ成立時は status を lobby_pending とする。

インデックス: status + created_at

セキュリティルール: 読み取りは可能だが、作成・更新は限定的

状態遷移（matches.status）:

```
waiting -> lobby_pending -> completed
```

変更タイミング:
- waiting -> lobby_pending: 10人マッチ成立時（自動マッチング生成時に設定）
- lobby_pending -> completed: 試合結果が確定した時点（多数決即時確定 or マッチング時刻から40分タイムアウト確定）

---

### 3.3 matches/{matchId}/members
試合参加者・観戦者（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | ユーザーID |
| role | string | participant / spectator |
| team | string | first / second（participantのみ） |
| seat_no | number | チーム内席番号(1-5)（participantのみ） |
| joined_at | timestamp | 参加時刻 |
| seated_at | timestamp \| null | 着席時刻（未着席はnull） |
| lobby_issue | boolean | 困り中フラグ |
| lobby_issue_at | timestamp \| null | 困り中設定時刻 |
| lobby_creating | boolean | ロビー作成中フラグ |
| lobby_creating_at | timestamp \| null | ロビー作成中設定時刻 |
| match_result | string \| null | 試合結果（win / loss / invalid、未入力はnull） |
| match_left_at | timestamp \| null | 退席時刻（未入力はnull） |

アプリ側制約: match内で user_id 重複不可、participant は最大10人

セキュリティルール: 自分自身のドキュメントのみ操作可能

---

### 3.4 matches/{matchId}/reports
未参加（ノーショー）通報の記録（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 試合ID |
| reporter_user_id | string | 通報者ユーザーID |
| reported_user_id | string | 被通報ユーザーID |
| reason | string | no_show / troll / other |
| reason_detail | string | reason が other の場合のみ必須 |
| match_created_at | timestamp | マッチ成立時刻 |
| reported_at | timestamp | 通報時刻 |
| screenshot_url | string | スクリーンショットURL（任意） |

アプリ側制約:
- match内で reporter_user_id + reported_user_id の重複不可
- 同一 match 内で reported_user_id に対する通報が **別ユーザーから3件** 集まったら、penalties を作成

セキュリティルール:
- 読み取りはマッチ参加者のみ
- 作成はマッチ参加者のみ、自己通報禁止

---

### 3.5 matches/{matchId}/match_results
試合結果の集計結果（サブコレクション、1件想定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| result | string | first_win / second_win / invalid |
| decided_at | timestamp | 確定時刻 |

---

### 3.6 matches/{matchId}/result_votes
結果入力（多数決の票、サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | 投票者 |
| vote | string | first_win / second_win / invalid |
| created_at | timestamp | 投票時刻 |

アプリ側制約: match内で user_id 重複不可

---

### 3.7 users/{userId}/penalties
ノーショー等のペナルティ（ユーザー配下サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 対象試合 |
| reason | string | no_show_report / other |
| banned_until | timestamp | インキュー禁止期限（penalty確定時刻 + 60分） |
| created_at | timestamp | ペナルティ確定時刻 |

インデックス: banned_until

---

### 3.8 users/{userId}/notifications
通知（ユーザー配下サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| type | string | 通知タイプ（penalty_applied） |
| match_id | string | 関連マッチID |
| reported_user_id | string | ペナルティを受けたユーザーID |
| reported_user_name | string | ペナルティを受けたユーザー名 |
| message | string | 表示メッセージ |
| read | boolean | 既読フラグ |
| created_at | timestamp | 作成日時 |

ドキュメントID: `{matchId}_{reportedUserId}`（重複防止用の固定形式）

セキュリティルール:
- 読み取り: 本人のみ
- 更新: 本人のみ（readフラグのみ変更可能）
- 作成・削除: バックエンドのみ

---

## 4. マスタ／補助データ

### 4.1 pokemons（JSON管理）
ポケモンマスターはFirestoreに持たず、JSONファイルで管理する。

- 配置: `public/pokemons.json`
- 更新方法: 開発者が手動で更新（デプロイ発生あり）
- 形式例:
  ```json
  [
    {
      "id": "pikachu",
      "name": "ピカチュウ",
      "type": "アタック型",
      "imageUrl": "https://example.com/pikachu.png"
    }
  ]
  ```
