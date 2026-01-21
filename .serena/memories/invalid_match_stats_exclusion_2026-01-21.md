# 無効試合の統計除外 (2026-01-21)

## 修正内容

`functions/src/index.ts` の `updateUserStats()` 関数で、無効試合（invalid）を `total_matches` から除外。

```typescript
// 行332
// Before
total_matches: totalMatches + 1,

// After
total_matches: totalMatches + (outcome !== "invalid" ? 1 : 0),
```

## 理由

無効試合が試合数にカウントされると、勝率が実態より低く計算されるため。

**例**: 5試合中2勝、2件無効
- Before: 勝率 40%（2/5）
- After: 勝率 66.7%（2/3）

## invalidと判定される条件

1. 投票がタイの場合（例: 4勝4敗の投票）
2. チーム未割り当ての場合
3. ユーザーが直接 invalid を選択した場合
4. タイムアウト時に投票不足の場合

## 影響範囲

- `total_matches`: invalidの場合インクリメントしない
- `total_wins`: 変更なし（winの場合のみ+1）
- `recent_results`: 変更なし（invalidも履歴には残る）
- `rating`: 変更なし（invalidの場合 rating_delta=0）

## 既存データ

Firestoreに保存済みの統計データは変更されない。
必要に応じて別途マイグレーションが必要。
