# Amazon Slot MCP（第一訴求画像）

日本のAmazon商品ページ向け **Slot 画像** を、ChatGPT Web の画像生成で作るための MCP です。

現在 **Slot1（第一訴求画像）** が利用可能です。Slot2〜6 は同じ構造で追加できます。

## これは何か

| 誰が | 何をするか |
| --- | --- |
| あなた | Slot番号・商品タイトル・商品説明・商品補足を入力し、商品実物画像をチャットに添付する |
| MCP | 指定 Slot の**固定ルール**を返す（画像生成APIは呼ばない） |
| ChatGPT | 添付画像 + 商品情報 + Slotルールに従い、**完成した 1:1 画像を1枚生成**する |

ユーザーに長い画像生成プロンプトを書かせるツールではありません。

## 公開 URL

| 用途 | URL |
| --- | --- |
| **ChatGPT に登録する MCP URL** | `https://amazon-slot-mcp.hiroyuki.workers.dev/mcp` |
| 動作確認（ブラウザ） | `https://amazon-slot-mcp.hiroyuki.workers.dev/health` |

ブラウザで `/mcp` を開いても画像は出ません。ChatGPT のコネクタ経由で使います。

---

## 使い方（ChatGPT）

### 1回だけの準備

#### ① Developer Mode をオン

1. ChatGPT を開く  
2. **Settings（設定）→ Apps & Connectors（アプリとコネクタ）→ Advanced settings（詳細設定）**  
3. **Developer Mode** を有効にする  

#### ② コネクタを登録

1. **Settings → Connectors**  
2. **Create** または **Add custom connector**  
3. 次を入力する  

| 項目 | 入力 |
| --- | --- |
| 名前 | `AmazonGenerator` など任意 |
| **MCP Server URL** | `https://amazon-slot-mcp.hiroyuki.workers.dev/mcp` |
| Authentication | **No authentication** |

4. 保存  

#### ③ チャットでコネクタをオン

1. **新しいチャット**を開く  
2. ツール／コネクタ一覧でコネクタを有効にする  

---

### 毎回の使い方（これだけでよい）

1. チャットに **商品の実物画像を添付**  
2. コネクタを指定し、次のように送る  

```text
@AmazonGenerator

Slot1

商品タイトル：
トリケラトプス ぬいぐるみ

商品説明：
ここに商品説明全文

商品補足：
ここに任意の補足情報
```

長い定型指示（「添付画像をもとに画像を生成してください」「1:1画像を作成してください」など）は**不要**です。

---

### うまくいったときの流れ

1. ChatGPT が `slot1` ツールを呼ぶ  
2. MCP が Slot1 固定ルールと「完成画像を今すぐ生成せよ」という指示を返す  
3. ChatGPT が会話内の添付画像と商品情報を使い、画像生成して **完成画像が1枚** 表示される  

### 失敗例

- プロンプト文だけ出して終わる  
- 元画像をそのまま返す  
- 白背景の商品単体（検索メイン画像風）になる  
- 説明にない機能・付属品が追加される  

やり直すときは:

```text
プロンプトではなく、完成した1:1の訴求画像を生成して表示して。
添付の商品画像は変えないで。
```

---

## Tools

| Tool | 用途 |
| --- | --- |
| `slot1` | **通常はこれ。** Slot1 固定ルールを返し、完成画像生成を要求する |
| `generate_slot_image` | `slot1` の後方互換エイリアス |

### 入力（共通）

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `product_title` | はい | 商品タイトル |
| `product_description` | はい | 商品説明 |
| `product_supplement` | いいえ | 商品補足 |

商品実物画像はツール引数ではなく、**現在のチャットへの添付**を使用します。

---

## Slot1 ルール要約

- Amazon商品ページ内の**第一訴求画像**（検索結果メイン画像ではない）  
- 白背景固定禁止  
- 添付の商品実物画像を保持（形状・色・柄・素材・ロゴ・印刷などを変更しない）  
- 説明から事実を抽出し、訴求軸は1つ  
- 画像上部に大きな日本語タイトル + 短い英語装飾  
- 1:1 の完成画像を1枚生成（プロンプトのみ返却は禁止）  
- MCP 自身は外部画像生成APIを呼ばない  

詳細は [`rules/slot1.md`](rules/slot1.md)。

---

## デプロイ（開発者向け）

```bash
npm install
npm run check
npm run build
npm run test:smoke
npm run deploy
```

## ローカル（開発者向け）

```bash
npm run dev          # Node http://localhost:3001/mcp
npm run dev:worker   # Workers 相当
```
