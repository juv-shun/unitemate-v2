# ユナメイト DB設計書

本書は `docs/要件定義書.md` を基に、Firebase（Cloud Firestore想定）でフェーズ1〜2で利用できるDB設計をまとめたもの。
フェーズ1で必要な最小構成を核に、フェーズ2（レート・結果確定・ペナルティ）を追加可能な拡張設計としている。

---

## 1. 前提・設計方針

- Firebase（Cloud Firestore）を前提とする。
- 主要キーはドキュメントID（UUID相当）を使用する。
- 変更履歴や集計に必要な「イベント性の高い情報」はサブコレクションで履歴化する。
- ドラフトは「セッション」「ターン」「アクション」に分割し、BAN/PICK共通ロジックで扱う。
- フェーズ1/2のマッチング後ドラフト、手動作成のドラフトマッチは同一構造で扱う。
- 参照整合性はアプリ側で担保する（FirestoreはFK制約を持たない）。

---

## 2. データ構造概要（コレクション）

- users（ユーザー）
  - rating_changes（サブコレクション）
  - penalties（サブコレクション）
  - pick_histories（サブコレクション）
- matches（試合/ルーム）
  - members（サブコレクション）
  - reports（サブコレクション）
  - result_votes（サブコレクション）
  - match_results（サブコレクション）
- draft_sessions（ドラフト）
  - turns（サブコレクション）
    - requests（サブコレクション）
    - selections（サブコレクション）
  - actions（サブコレクション）

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

インデックス: queue_status + queue_joined_at

recent_results 要素:
- match_id: string
- result: win / loss / invalid
- matched_at: timestamp（マッチング時刻）
- rating_delta: number（レート変動値）

---



### 3.3 matches
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

状態遷移（matches.status）:

```
waiting -> lobby_pending -> completed
```

変更タイミング:
- waiting -> lobby_pending: 10人マッチ成立時（自動マッチング生成時に設定）
- lobby_pending -> completed: 試合結果が確定した時点（多数決即時確定 or マッチング時刻から40分タイムアウト確定）

---

### 3.4 matches/{matchId}/members
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
| match_result | string \| null | 試合結果（win / loss / invalid、未入力はnull） |
| match_left_at | timestamp \| null | 退席時刻（未入力はnull） |

アプリ側制約: match内で user_id 重複不可、participant は最大10人

---

### 3.5 draft_sessions
ドラフト単位（フェーズ1/2共通）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| source_type | string | match |
| match_id | string | 試合ID |
| status | string | waiting / in_progress / completed |
| started_at | timestamp | 開始時刻 |
| completed_at | timestamp | 完了時刻 |
| expires_at | timestamp | ドラフト履歴の期限（20日） |
| created_at | timestamp | 作成日時 |

アプリ側制約: match_id 必須

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
| decided_by | string | assignee / approved_request / auto_last_click / auto_random |
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
| status | string | pending / approved / canceled |
| approved_by_user_id | string | 承認者 |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

アプリ側制約: 承認はターン内で1件のみ

---

### 3.9 draft_sessions/{draftId}/turns/{turnId}/selections
クリック状態（仮選択）の履歴（1ユーザー1件想定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | 選択ユーザー |
| pokemon_id | string | 選択中ポケモン |
| updated_at | timestamp | 更新日時 |

アプリ側制約: turn内で user_id 重複不可

---

### 3.10 matches/{matchId}/reports
未参加（ノーショー）通報の記録（サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 試合ID |
| reporter_user_id | string | 通報者ユーザーID |
| reported_user_id | string | 被通報ユーザーID |
| reason | string | no_show |
| match_created_at | timestamp | マッチ成立時刻 |
| reported_at | timestamp | 通報時刻 |
| screenshot_url | string | スクリーンショットURL（任意） |

アプリ側制約:
- match内で reporter_user_id + reported_user_id の重複不可
- 同一 match 内で reported_user_id に対する通報が **別ユーザーから3件** 集まったら、penalties を作成

---

### 3.11 matches/{matchId}/match_results（フェーズ2）
試合結果の集計結果（サブコレクション、1件想定）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| result | string | first_win / second_win / invalid |
| decided_at | timestamp | 確定時刻 |

---

### 3.12 matches/{matchId}/result_votes（フェーズ2）
結果入力（多数決の票、サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| user_id | string | 投票者 |
| vote | string | first_win / second_win / invalid |
| created_at | timestamp | 投票時刻 |

アプリ側制約: match内で user_id 重複不可

---

### 3.13 users/{userId}/rating_changes（将来拡張）
Elo反映履歴（ユーザー配下サブコレクション）。現状は未使用で、`users.rating` と `users.recent_results.rating_delta` に集約する。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 試合 |
| before_rating | number | 変更前レート |
| after_rating | number | 変更後レート |
| changed_at | timestamp | 反映時刻 |

インデックス: changed_at

---

### 3.14 users/{userId}/penalties（フェーズ2）
ノーショー等のペナルティ（ユーザー配下サブコレクション）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| match_id | string | 対象試合 |
| reason | string | no_show_report / other |
| banned_until | timestamp | インキュー禁止期限（penalty確定時刻 + 60分） |
| created_at | timestamp | ペナルティ確定時刻 |

インデックス: banned_until

---

### 3.15 users/{userId}/pick_histories
ユーザーのPICK履歴（永続保存）。

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| pokemon_id | string | 使用ポケモン |
| picked_at | timestamp | 確定時刻 |
| match_id | string | 試合ID |
| draft_id | string | ドラフトID |
| team | string | first / second |
| is_auto | boolean | auto確定かどうか |

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
※フェーズ1の自動マッチ成立時は status を lobby_pending とする。
1. users の queue_status を waiting に更新  
2. マッチ成立で matches, matches/{matchId}/members を作成  
3. draft_sessions を作成し、draft_sessions/{draftId}/turns を事前生成  
4. turn_started を通知し、決定したら draft_sessions/{draftId}/actions を追加  
5. PICK確定時に users/{userId}/pick_histories を追加  
6. ドラフト完了で matches/{matchId}/lobby_infos 作成 → ホスト入力  

### 5.2 フェーズ1 手動作成ドラフトマッチ
1. matches を作成（source_type = manual, status = waiting）  
2. matches/{matchId}/members に participant を追加  
3. participant が10人揃い次第、status を lobby_pending に更新  
4. draft_sessions 作成 → turns を生成  
5. actions で結果確定  
6. PICK確定時に users/{userId}/pick_histories を追加  

### 5.3 フェーズ2 結果確定とレート反映
1. matches/{matchId}/result_votes に投票  
2. 多数決で matches/{matchId}/match_results 確定  
3. users/{userId}/rating_changes 作成  
4. reports で no_show_report 判定（同一 match 内で別ユーザーから3件）  
5. no_show_report を users/{userId}/penalties に記録  

---

## 6. 制約・整合性ルール（主要）

- 1試合10人（members の participant は10件固定）
- BAN/PICKの同一ポケモン重複禁止（actions 追加時にアプリ側でチェック）
- ターン内承認1件（requests はアプリ側で制御）
- リクエストは送信後に更新可能（status は pending のまま pokemon_id を更新）
- ロビーID未入力再抽選は lobby_infos.status を更新
- ドラフト履歴は expires_at を超えたら削除（20日）

---

## 7. フェーズ別利用範囲

- フェーズ1: users, matches, members（match_result含む）, draft_sessions, turns, actions, requests, selections, lobby_infos, pick_histories
- フェーズ2: 上記 + match_results, result_votes, rating_changes, penalties
