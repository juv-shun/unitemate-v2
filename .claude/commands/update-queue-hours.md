# キュー開放時間の変更

キューの開放時間を変更します。

## 使い方

```
/update-queue-hours <開始時刻> <終了時刻>
```

例: `/update-queue-hours 18:00 02:00`（18時から翌2時）

## 引数

$ARGUMENTS

## 実行手順

1. 引数から開始時刻と終了時刻をパースする
2. 以下の3箇所を更新する:

### 1. フロントエンド - isQueueClosedAt関数

ファイル: `src/features/queue/queue.ts`

`isQueueClosedAt` 関数のロジックを更新する。
- 開放時間帯 **以外** が閉鎖なので、閉鎖条件を計算する
- 日をまたぐ場合（終了時刻 < 開始時刻）は特別な処理が必要

**日をまたがない場合**（例: 10:00〜18:00）:
- 閉鎖: `minutes < 開始分 || minutes >= 終了分`

**日をまたぐ場合**（例: 18:00〜02:00）:
- 閉鎖: `minutes >= 終了分 && minutes < 開始分`

### 2. フロントエンド - 案内文

ファイル: `src/features/queue/components/QueueSection.tsx`

「開催時間: XX:XX〜XX:XX」の表示を更新する。
- 日をまたぐ場合は「開催時間: XX:XX〜翌XX:XX」と表示

### 3. Cloud Functions - スケジュールジョブ

ファイル: `functions/src/matchmaking/index.ts`

`resetQueueAtClose` のスケジュールを終了時刻に合わせて更新する。
- `schedule: "0 {終了時} * * *"` の形式
- コメントも更新する（「毎日翌X時JST」など）

## 注意事項

- Cloud Functionsの変更後は `firebase deploy --only functions` が必要
- 時刻は24時間形式で指定（例: 02:00, 18:00）
