# SmartForm Frontend

手書き報告書の画像からOCRでテキスト抽出し、データベースで管理・活用するためのWebアプリケーション（フロントエンド）です。

## 🛠 技術スタック

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages

---

## 🚀 ローカル開発環境の起動

依存パッケージのインストールと開発サーバーの起動手順です。

```bash
# パッケージインストール
npm install

# 開発サーバー起動（ローカル）
npm run dev

# VPS等のリモート環境からアクセスする場合
npm run dev -- -H 0.0.0.0 -p 3000
