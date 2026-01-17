# コードスタイルと規約

## Biome設定
- **インデントスタイル**: タブ
- **クオートスタイル**: ダブルクォート（"）
- **インポート整理**: 自動（source.organizeImports: on）
- **Lintルール**: recommended有効

## TypeScript規約
- **Strictモード**: 有効
- **未使用変数**: 禁止（noUnusedLocals: true）
- **未使用パラメータ**: 禁止（noUnusedParameters: true）
- **型ヒント**: 必須（ユーザー指示による）

## ファイル命名規則
- **コンポーネント**: PascalCase（例: `ProtectedRoute.tsx`, `LoginPage.tsx`）
- **ユーティリティ**: camelCase（例: `user.ts`, `firebase.ts`）
- **スタイル**: kebab-case（例: `index.css`）

## ディレクトリ構造
```
src/
├── components/     # 再利用可能なコンポーネント
├── pages/          # ページコンポーネント
├── contexts/       # React Context
├── lib/            # ユーティリティ関数
├── assets/         # 静的アセット
├── App.tsx         # ルートコンポーネント
├── main.tsx        # エントリポイント
└── index.css       # グローバルスタイル
```

## コンポーネント設計
- 関数コンポーネントを使用
- React 19の新機能を活用
- Contextによる状態管理（AuthContext等）
