# 2026-01-21 変更メモ

## ロビー作成中フラグ追加
- membersに `lobby_creating` / `lobby_creating_at` を追加（`lobby_issue` と独立、同時true可）
- 取得/購読/更新API追加:
  - `src/features/draft/match.ts` に `setLobbyCreating` / `unsetLobbyCreating` を実装
  - `getMembers` / `subscribeToMembers` に新フィールドのマッピング追加
- 型定義更新: `src/features/draft/types.ts` の `Member` に新フィールド追加
- Context更新: `src/features/draft/MatchContext.tsx` に set/unset を追加し Provider に公開
- UI更新: `src/features/draft/components/MatchLobby.tsx`
  - ボタン追加（「私がロビー作成します」/「ロビー作成中を解除」）
  - 「ロビーに入れない」解除ボタン文言を「ロビーに入れないを解除」に変更
  - ボタン順は「ロビー作成中系 → ロビーに入れない系」に並び替え
  - 座席横ラベルも同順で表示、両方点滅
  - 「ロビー作成中」ラベル色はスカイブルー系（#38bdf8）
- Firestore rules更新: `firestore.rules` のmembers更新許可に `lobby_creating` / `lobby_creating_at` を追加
- 仕様更新: `docs/db_spec.md` に新フィールド追加

## チーム色変更（ロビー画面）
- `src/features/draft/components/MatchLobby.tsx` の `TeamDisplay` でアクセント色変更
  - 先攻: パープル `#8b5cf6`
  - 後攻: オレンジ `#f97316`

## キュー閉鎖の一時解除（動作確認用）
- `src/features/queue/queue.ts` の `isQueueClosedAt` を一時的に常時 false に変更
  - コメント: 「一時的に動作確認用で常時開放」
  - 後で元の時間判定へ戻す前提
