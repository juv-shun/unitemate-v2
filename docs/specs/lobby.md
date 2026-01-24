# ロビーページ仕様

## 目的
- マッチ成立後の待機・連絡・結果報告を行う
- ロビーID共有、着席確定、通報、試合終了報告を集約する
  - 関連ファイル: `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/DraftSimulationPage.tsx`

## 対象URL
- `/lobby/:matchId?`
  - 関連ファイル: `src/App.tsx`

## 遷移/表示優先
- マッチング待機中は本サービス内の他ページへ遷移可能
- マッチ成立（`queue_status == "matched"`）時は現在ページに関わらずロビー画面へ強制遷移
- 退出処理が完了するまで、トップなどへ遷移してもロビー画面が表示される
  - 関連ファイル: `src/features/queue/QueueContext.tsx`, `src/App.tsx`

## マッチ成立時の通知/着席
- マッチ成立時に効果音を再生
- ロビーに到達後、確認モーダルを表示
- 「ロビーへ進む」等のボタン押下で着席状態（`seated_at`）になる
  - 関連ファイル: `src/features/queue/QueueContext.tsx`, `src/features/queue/matchSound.ts`, `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/match.ts`, `functions/src/lobby/index.ts`

## ロビーID共有
- ロビーIDは8桁の数字
- 誰でも入力可能、既存ロビーIDがあっても上書き可能（後勝ち）
- 上書き時は確認モーダルを表示
  - 関連ファイル: `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/match.ts`, `functions/src/lobby/index.ts`

## ステータス共有ボタン
- 「私がロビー作成します」ボタン（ロビー作成中の通知）
- 「ロビーに入れない」ボタン（困り中の通知）
- どちらも解除ボタンあり
  - 関連ファイル: `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/MatchContext.tsx`, `src/features/draft/match.ts`

## 通報
- 各ユーザーの横に通報ボタンを表示
- 通報理由: no_show / troll / other（other時は詳細必須）
- スクリーンショット添付は任意
  - 関連ファイル: `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/match.ts`, `functions/src/report/index.ts`, `firestore.rules`, `storage.rules`

## 通報ペナルティ
- 同一マッチ内で異なる通報者から3件の通報でペナルティ付与
- ペナルティ中はインキュー不可（`users.banned_until`）
- 既に成立しているマッチ（進行中のロビー）には影響しない
- 現行実装のペナルティ時間は **30分**
  - 関連ファイル: `functions/src/report/index.ts`, `src/features/queue/QueueContext.tsx`, `src/features/queue/components/QueueSection.tsx`

## 試合終了/結果報告
- 「試合終了 / 退出」ボタンで結果入力モーダルを開く
- 結果入力は必須（勝利 / 敗北 / 無効 の3択）
- 送信時に `match_result` と `match_left_at` を更新
  - 関連ファイル: `src/features/draft/components/MatchLobby.tsx`, `src/features/draft/match.ts`, `functions/src/result/index.ts`

## 勝敗確定ロジック（バックエンド）
- 参加者の結果報告を多数決で確定
- 7人以上の報告が集まった時点で確定処理を実行
- マッチ作成から40分経過でタイムアウト確定（未入力があっても確定）
- 同数は「無効（invalid）」
  - 関連ファイル: `functions/src/result/index.ts`, `docs/requirements/phase2.md`

## レート計算アルゴリズム
- Elo 系（K係数を用いた期待勝率計算）で、同チーム/相手チームをレート順にペアリングして差分を算出
- `final_result` が `invalid` の場合は全員のレート差分は 0
- チーム内で余ったメンバーはレート差分 0
- レート差分は四捨五入して整数化
  - 関連ファイル: `functions/src/result/index.ts`

## マイページの試合数/勝利数の加算
- 勝敗確定時に `users` の `total_matches` / `total_wins` を更新
- `invalid` の試合は `total_matches` に加算しない
- `win` のみ `total_wins` を +1
- `recent_results` に最新20件を保存し、マイページで参照
  - 関連ファイル: `functions/src/result/index.ts`, `src/features/mypage/MyPage.tsx`

## 備考/要確認
- ペナルティ時間は現行実装が30分だが、既存ドキュメントで60分記載があるため要確認
