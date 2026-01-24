# CLAUDE.md - V-Arena 開発ガイド

本サービスは、V-Arenaというポケモンユナイトの対戦マッチングを提供するWebアプリケーションです。

元のサービス名はユナメイト(unitemate)であり、途中で名称変更しました。

## ドキュメント・メモリ参照先

実装前に必ず関連するドキュメントとメモリを確認してください。

| 情報 | 参照先 |
|------|--------|
| データベース設計 | `docs/db_design.md` |
| 機能仕様 | `docs/specs/` |
| コードベース構造 | Serenaメモリ `codebase_structure` |
| コードスタイル | Serenaメモリ `code_style_and_conventions` |
| 技術スタック | Serenaメモリ `tech_stack` |
| タスク完了チェックリスト | Serenaメモリ `task_completion_checklist` |

## 重要な制約と方針

### Firebase環境の調査
Firebaseのデプロイ状態を確認する際は、`firebase-inspector`サブエージェントを使用。
```
Task(subagent_type: "firebase-inspector", prompt: "調査内容", description: "Firebase inspection")
```

### Callable Functions の Cloud Run IAM 設定（重要）

新しい**Callable Function（`onCall`）**を追加した場合、本番環境では**Cloud RunのIAM設定を手動変更**する必要があります。

**理由**: Cloud Functions v2のCallable Functionsは、デフォルトでCloud RunのIAM認証が有効。Firebase AuthトークンはCloud IAMとは別物のため、「公開アクセスを許可」に設定しないとクライアントからの呼び出しが拒否されます。

**設定手順**:
1. [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run?project=unitemate-v2)にアクセス
2. 対象のCallable Functionを選択
3. 「セキュリティ」→「認証」を「**公開アクセスを許可する**」に変更

**対象**: `httpsCallable`で呼び出す関数のみ。スケジュール実行やFirestoreトリガーは対象外。
