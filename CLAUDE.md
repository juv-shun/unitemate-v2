# CLAUDE.md

## はじめに

同ディレクトリの README.md をはじめに参照し、内容を理解してください。

## コード規約

### Python (バックエンド)

- パッケージ管理: `uv`
- Linter/Formatter: `ruff`
- TypeChecker: `mypy`
- 型ヒント必須
- Python 3.12 対応

### TypeScript/React (フロントエンド)

- Linter: ESLint
- Formatter: Prettier
- React 19 + TypeScript
- Vite を使用したビルド

### 開発ルール

- backend ディレクトリ配下を改修した場合、backend ディレクトリ配下にて、 `make check` を実行して、コード品質を確認してください。
- frontend ディレクトリ配下を改修した場合、frontend ディレクトリ配下にて、 `make check` を実行して、コード品質を確認してください。

## 重要な注意事項

### Serverless Framework / Python ランタイム

- **このプロジェクトは Python 3.12 を使用する**
- Serverless IDE の診断エラーで python3.12 が対応していないと表示されることがあるが、**無視すること**
- Serverless IDE のサポートが止まっており、Python 3.12 対応に追従していないだけ
- AWS Lambda は実際には Python 3.12 をサポートしている
- `runtime: python3.12`を`python3.11`に変更してはいけない
