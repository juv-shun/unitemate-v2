# キュー受付終了時の自動リセット機能

## 実装日
2026-01-22

## 概要
毎日23時（JST、キュー受付終了時刻）に `queue_status === "waiting"` のユーザーを自動リセットする Firebase Functions スケジュール関数を追加。

## 変更ファイル
- `functions/src/matchmaking/index.ts` - `resetQueueAtClose` 関数を追加
- `functions/src/index.ts` - re-export を追加

## 実装内容

### resetQueueAtClose 関数
- **実行時刻**: 毎日23時（JST）
- **対象**: `queue_status === "waiting"` のユーザーのみ（`matched` は対象外）
- **処理**: 
  - `queue_status` → `null`
  - `queue_joined_at` → `null`
  - `matched_match_id` → `null`
  - `updated_at` → `serverTimestamp()`
- **バッチ処理**: Firestore の 500件/バッチ制限に対応

## クライアント側の挙動
クライアントは `onSnapshot` でリアルタイム購読しているため、サーバー側で `queue_status` を `null` に更新すると：
1. Firestoreのリスナーが即座に変更を検知（数百ms以内）
2. UIが自動的に「FIND MATCH」ボタン表示に戻る

## デプロイ
```bash
firebase deploy --only functions:resetQueueAtClose
```

## 備考
- Cloud Run IAM 設定は不要（`onSchedule` は Callable Function ではないため）
- 23時はキュー受付終了時刻のため、`runMatchmaking` との競合は発生しない
