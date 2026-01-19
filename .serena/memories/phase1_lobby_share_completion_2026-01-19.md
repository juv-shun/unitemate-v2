# フェーズ1（ロビー共有）完了状況

## 完了日
2026-01-19

## 概要
フェーズ1のロビー共有仕様を実装・調整し、ロビー画面は /lobby に統一。マッチ成立後はロビー画面に遷移し、着席はモーダルで確定。ロビーIDは後勝ち上書き。困り中表示と通報は継続可能。in_game への遷移は廃止し、lobby_pending のまま維持。

## 現行仕様（抜粋）
- マッチ成立時に status = lobby_pending
- ロビーIDは8桁数字、先頭0可、誰でも上書き可（後勝ち）
- 着席はマッチ直後のモーダルで「ロビーへ進む」を押すと自動着席
- 困り中/解除ボタンあり。表示は「ロビーに入れない」ラベル（点滅）
- 通報は着席/未着席問わず可能
- ロビーID入力済みかつ全員着席でも status は lobby_pending のまま維持（in_game 廃止）
- 試合終了ボタンで退出・キュー状態リセット

## 主要ファイル
- ルーティング: `src/App.tsx`（/lobby/:matchId?）
- 遷移: `src/features/queue/QueueContext.tsx`, `src/features/queue/components/QueueSection.tsx`, `src/features/match/MatchResultPage.tsx`, `src/features/draft/components/CreateMatchButton.tsx`, `src/features/draft/components/JoinMatchForm.tsx`
- ロビーUI: `src/features/draft/components/MatchLobby.tsx`
- ロビー機能API: `src/features/draft/match.ts`
- Context: `src/features/draft/MatchContext.tsx`
- Functions: `functions/src/index.ts`

## ルール・ドキュメント
- Firestore rules: `firestore.rules`（lobby_pending時の更新許可、reportsのscreenshot_url対応）
- Storage rules: `storage.rules`（reports配下アップロード許可）
- Firebase設定: `firebase.json`, `src/firebase.ts`（Storageエミュレータ追加）
- 仕様書: `docs/requirements_phase1.md`, `docs/db_spec.md`, `docs/tmp/phase1_lobby_plan.md`

## 通報モーダル
- モーダルで「ゲームに来なかった」以外は対象外である旨を強調
- スクリーンショット添付は任意（Firebase StorageへアップロードしURL保存）
- reportsに `screenshot_url` を追加

## ステータス変更の削除
- in_game 遷移ロジック削除（Functions/Context/型/ドキュメント更新済み）

## 既知の注意
- Storageエミュレータは 9199 を使用
- reports作成はクライアント直書きで、screenshot_url は任意
