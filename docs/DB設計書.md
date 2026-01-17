# ユナメイト DB設計書

本書は `docs/要件定義書.md` を基に、Firebase（Cloud Firestore想定）でフェーズ1〜3を通して利用できるDB設計をまとめたもの。
フェーズ1で必要な最小構成を核に、フェーズ2（レート・結果確定・ペナルティ）とフェーズ3（ルーム型ドラフト）を追加可能な拡張設計としている。

---

## 1. 前提・設計方針

- Firebase（Cloud Firestore）を前提とする。
- 主要キーはドキュメントID（UUID相当）を使用する。
- 変更履歴や集計に必要な「イベント性の高い情報」はサブコレクションで履歴化する。
- ドラフトは「セッション」「ターン」「アクション」に分割し、BAN/PICK共通ロジックで扱う。
- フェーズ1/2のマッチング後ドラフト、フェーズ3のルームドラフトは同一構造で扱う。
- 参照整合性はアプリ側で担保する（FirestoreはFK制約を持たない）。

---

## 2. データ構造概要（コレクション）

- users（ユーザー）
  - rating_changes（サブコレクション）
  - penalties（サブコレクション）
- queue_entries（キュー）
- matches（試合）
  - participants（サブコレクション）
  - lobby_infos（サブコレクション）
  - result_votes（サブコレクション）
  - match_results（サブコレクション）
- draft_sessions（ドラフト）
  - turns（サブコレクション）
    - requests（サブコレクション）
  - actions（サブコレクション）
- rooms（ルーム）
  - members（サブコレクション）
  - seats（サブコレクション）

---

## 3. コレクション定義

### 3.1 users
ユーザー基本情報。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| display_name | string | 表示名 |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

---

### 3.2 queue_entries
インキュー状態管理（フェーズ1/2）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | ユーザーID |
| queued_at | timestamp | キュー参加時刻 |
| status | string | queued / matched / canceled |
| matched_match_id | string | マッチ成立時の試合ID |

インデックス: status + queued_at

---

### 3.3 matches
試合単位のデータ。フェーズ1/2で使用。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| phase | string | phase1 / phase2 |
| status | string | draft_pending / drafting / lobby_pending / in_game / completed / invalid |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

---

### 3.4 matches/{matchId}/participants
試合参加者・チーム情報（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | ユーザーID |
| team | string | first / second |
| seat_no | number | チーム内席番号(1-5) |
| joined_at | timestamp | 参加時刻 |

アプリ側制約: match内で user_id 重複不可

---

### 3.5 draft_sessions
ドラフト単位（フェーズ1/2/3共通）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| source_type | string | match / room |
| match_id | string | 試合起因なら設定 |
| room_id | string | ルーム起因なら設定 |
| status | string | waiting / in_progress / completed |
| first_team | string | first / second |
| started_at | timestamp | 開始時刻 |
| completed_at | timestamp | 完了時刻 |
| created_at | timestamp | 作成日時 |

アプリ側制約: source_typeに応じて match_id / room_id を必須化

---

### 3.6 draft_sessions/{draftId}/turns
BAN/PICKターン定義（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| turn_no | number | ターン順 |
| action_type | string | ban / pick |
| team | string | first / second |
| slot_no | number | チーム内BAN/PICK枠番号 |
| assignee_user_id | string | 担当者 |
| deadline_at | timestamp | 期限（15秒） |
| started_at | timestamp | ターン開始時刻 |
| completed_at | timestamp | ターン完了時刻 |

アプリ側制約: draft内で turn_no 重複不可

---

### 3.7 draft_sessions/{draftId}/actions
確定したBAN/PICK結果（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| turn_id | string | ターンID |
| action_type | string | ban / pick |
| team | string | first / second |
| pokemon_id | string | ポケモン識別子 |
| decided_by | string | assignee / approved_request / auto_random |
| decided_user_id | string | 操作ユーザー（auto_randomはNULL） |
| decided_at | timestamp | 確定時刻 |

アプリ側制約: draft内で pokemon_id 重複不可

---

### 3.8 draft_sessions/{draftId}/turns/{turnId}/requests
BAN/PICKのリクエスト（承認で確定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| requester_user_id | string | リクエスト者 |
| pokemon_id | string | 希望ポケモン |
| status | string | pending / approved / rejected / expired |
| approved_by_user_id | string | 承認者 |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

アプリ側制約: 承認はターン内で1件のみ

---

### 3.9 matches/{matchId}/lobby_infos
ロビーID管理（サブコレクション、1件想定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| host_user_id | string | ホスト |
| lobby_id | string | 入力されたロビーID |
| status | string | waiting / entered / reselecting / invalid |
| input_deadline_at | timestamp | 入力期限（2分） |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

---

### 3.10 rooms（フェーズ3）
ドラフト専用ルーム。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| owner_user_id | string | ルーム作成者 |
| join_code | string | 参加用識別子 |
| status | string | waiting / ready / drafting / completed |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

インデックス: join_code

---

### 3.11 rooms/{roomId}/members
ルーム参加者（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | ユーザー |
| joined_at | timestamp | 入室時刻 |

アプリ側制約: room内で user_id 重複不可

---

### 3.12 rooms/{roomId}/seats
ルームの席（先攻/後攻、サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| team | string | first / second |
| seat_no | number | 1-5 |
| user_id | string | 着席ユーザー（空席はNULL） |
| seated_at | timestamp | 着席時刻 |

アプリ側制約: team+seat_no 重複不可、room内で user_id 1席のみ

---

### 3.13 matches/{matchId}/match_results（フェーズ2）
試合結果の集計結果（サブコレクション、1件想定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| result | string | first_win / second_win / invalid |
| decided_at | timestamp | 確定時刻 |

---

### 3.14 matches/{matchId}/result_votes（フェーズ2）
結果入力（多数決の票、サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | 投票者 |
| vote | string | first_win / second_win / invalid |
| created_at | timestamp | 投票時刻 |

アプリ側制約: match内で user_id 重複不可

---

### 3.15 users/{userId}/rating_changes（フェーズ2）
Elo反映履歴（ユーザー配下サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 試合 |
| before_rating | number | 変更前レート |
| after_rating | number | 変更後レート |
| changed_at | timestamp | 反映時刻 |

インデックス: changed_at

---

### 3.16 users/{userId}/penalties（フェーズ2）
ノーショー等のペナルティ（ユーザー配下サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 対象試合 |
| reason | string | no_show / other |
| banned_until | timestamp | インキュー禁止期限 |
| created_at | timestamp | 作成日時 |

インデックス: banned_until

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

---

## 5. 主要ユースケースとDB更新フロー

### 5.1 フェーズ1/2 マッチング〜ドラフト
1. queue_entries に queued を追加  
2. マッチ成立で matches, matches/{matchId}/participants を作成  
3. draft_sessions を作成し、draft_sessions/{draftId}/turns を事前生成  
4. turn_started を通知し、決定したら draft_sessions/{draftId}/actions を追加  
5. ドラフト完了で matches/{matchId}/lobby_infos 作成 → ホスト入力  

### 5.2 フェーズ3 ルーム型ドラフト
1. rooms を作成、join_code を発行  
2. rooms/{roomId}/members / rooms/{roomId}/seats に着席  
3. 10席埋まり次第、draft_sessions 作成 → turns  
4. actions で結果確定  

### 5.3 フェーズ2 結果確定とレート反映
1. matches/{matchId}/result_votes に投票  
2. 多数決で matches/{matchId}/match_results 確定  
3. users/{userId}/rating_changes 作成  
4. no_show などを users/{userId}/penalties に記録  

---

## 6. 制約・整合性ルール（主要）

- 1試合10人（participants は10件固定）
- BAN/PICKの同一ポケモン重複禁止（actions 追加時にアプリ側でチェック）
- ターン内承認1件（requests はアプリ側で制御）
- ルーム座席は1人1席（seats でアプリ側制御）
- ロビーID未入力再抽選は lobby_infos.status を更新

---

## 7. フェーズ別利用範囲

- フェーズ1: users, queue_entries, matches, participants, draft_sessions, turns, actions, requests, lobby_infos
- フェーズ2: 上記 + match_results, result_votes, rating_changes, penalties
- フェーズ3: users, rooms, members, seats, draft_sessions, turns, actions, requests
