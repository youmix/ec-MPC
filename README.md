# Amazon Slot Prompt MCP

Amazon商品画像のSlotルールをChatGPTへ提供する、最小構成のTypeScript製MCPサーバーです。現在はSlot 1（メイン商品画像）のみ対応しています。

MCPサーバーは画像を生成しません。`build_slot_prompt`が商品情報と[`rules/slot1.md`](rules/slot1.md)を統合し、ChatGPTの画像生成機能へそのまま渡せる指示文を返します。

## 必要環境

- Node.js 20以上
- npm
- ChatGPT Developer Modeを利用できるアカウントまたはワークスペース
- GitHubアカウントとVercelアカウント（公開デプロイする場合）
- ローカルで試す場合は、HTTPSの公開URLを作れるトンネル（Cloudflare Tunnelやngrokなど）

## 起動

```bash
npm install
npm run dev
```

既定では次のURLで待ち受けます。

- MCP: `http://localhost:3001/mcp`
- 動作確認: `http://localhost:3001/health`

本番相当の起動:

```bash
npm run build
npm start
```

ポートは環境変数で変更できます。

```bash
PORT=8080 npm start
```

## VercelへGitHub連携でデプロイ

このリポジトリにはVercel Functions用の`api/mcp.ts`と`vercel.json`が含まれています。環境変数やデータベースは不要です。

1. このプロジェクトをGitHubリポジトリへpushします。
2. [Vercel Dashboard](https://vercel.com/new)で **Add New → Project** を開きます。
3. GitHubを接続し、pushしたリポジトリを **Import** します。
4. **Framework Preset** は **Other** のままにします。
5. Root Directoryは、この`package.json`と`vercel.json`が存在するディレクトリを選びます。リポジトリ直下なら変更不要です。
6. Build Command、Output Directory、Environment Variablesは設定せず、**Deploy** を実行します。
7. デプロイ後、ブラウザで`https://<project-name>.vercel.app/health`を開き、`{"status":"ok"}`が返ることを確認します。

ChatGPTへ登録するMCP URL:

```text
https://<project-name>.vercel.app/mcp
```

`main`ブランチへpushするとProduction Deploymentが更新され、他のブランチやPull RequestへのpushではPreview Deploymentが作られます。ChatGPTの常設コネクターには、変わらないProduction URLを使用してください。

## ChatGPT Developer Modeへの登録

ChatGPTからはインターネット経由で到達できるHTTPS URLが必要です。VercelへデプロイしたURL、またはローカルサーバーをトンネルで公開したURLを使用してください。登録するURLの末尾には必ず`/mcp`を付けます。

例: `https://your-domain.example/mcp`

`http://localhost:3001/mcp`、`http://127.0.0.1:3001/mcp`、LAN内IPは登録できません。これらを入力すると`Unsafe URL`になるため、必ず公開された`https://` URLを使ってください。

### Cloudflare Tunnelでローカル確認する場合

ターミナル1でMCPサーバーを起動します。

```bash
npm run dev
```

ターミナル2で一時的な公開URLを作ります。

```bash
cloudflared tunnel --url http://localhost:3001
```

表示されたURLが、たとえば次の場合:

```text
https://random-words.trycloudflare.com
```

ChatGPTのMCP Server URLには、末尾に`/mcp`を追加して登録します。

```text
https://random-words.trycloudflare.com/mcp
```

両方のプロセスを起動したまま使用してください。CloudflareのQuick Tunnel URLは再起動すると変わるため、その場合はコネクターURLも更新します。

1. ChatGPTの **Settings（設定）→ Apps & Connectors（アプリとコネクタ）→ Advanced settings（詳細設定）** でDeveloper Modeを有効にします。
2. **Settings → Connectors** からコネクタ作成画面を開きます（表示によっては **Create** または **Add custom connector**）。
3. 名前に任意の名前（例: `Amazon Slot Prompt`）、MCP Server URLに公開した`https://.../mcp`を入力します。
4. このPoCは認証を実装していないため、Authenticationは **No authentication** を選びます。
5. 保存後、新しいチャットのツール／コネクタ一覧で作成したコネクタを有効にします。

> 設定項目の名称はChatGPTの更新やワークスペース設定で異なる場合があります。Developer Modeやカスタムコネクタが表示されない場合は、プラン・ロール・管理者ポリシーを確認してください。

## 使用例

ChatGPTでコネクタを有効にして、次のように依頼します。

```text
build_slot_promptを使って次の商品用のSlot 1画像を生成してください。

商品名: ステンレス真空ボトル 500ml
商品説明: マットブラック。ねじ式の蓋。保温・保冷対応。
補足情報: ボトル本体のみ。ロゴなし。
```

ツール入力:

```json
{
  "product_title": "ステンレス真空ボトル 500ml",
  "product_description": "マットブラック。ねじ式の蓋。保温・保冷対応。",
  "supplementary_info": "ボトル本体のみ。ロゴなし。"
}
```

## Tool仕様

### `build_slot_prompt`

| 入力 | 型 | 必須 | 内容 |
| --- | --- | --- | --- |
| `product_title` | string | はい | 商品名 |
| `product_description` | string | いいえ | 商品の説明、特徴、仕様 |
| `supplementary_info` | string | いいえ | 追加条件、ブランド情報、避けたい表現 |

返却値は画像生成用の詳細なテキスト指示です。画像生成API、データベース、認証、UIは含みません。

## ルールの変更

Slot 1のルールは[`rules/slot1.md`](rules/slot1.md)にあります。ファイルはTool実行のたびに読み込まれるため、開発中はルール変更後のサーバー再起動は不要です。

## 構成

```text
.
├── rules/
│   └── slot1.md
├── api/
│   ├── health.ts
│   └── mcp.ts
├── src/
│   ├── index.ts
│   └── mcp.ts
├── .gitignore
├── package.json
├── README.md
├── tsconfig.json
└── vercel.json
```

## セキュリティ上の注意

認証なしの公開URLはURLを知る人なら呼び出せます。この構成はPoC専用です。継続運用する場合は、HTTPS対応ホスティング、OAuthなどの認証、レート制限、ログ方針を別途設計してください。
