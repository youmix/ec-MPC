import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const slot1RulePath = resolve(process.cwd(), "rules/slot1.md");

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "amazon-slot-prompt",
    version: "0.1.0",
  });

  server.registerTool(
    "build_slot_prompt",
    {
      title: "Build Amazon Slot 1 image prompt",
      description:
        "Amazon商品情報とSlot 1ルールを統合し、ChatGPTの画像生成機能へそのまま渡せる詳細な画像生成指示を作成します。画像自体は生成しません。",
      inputSchema: {
        product_title: z.string().trim().min(1).describe("商品名"),
        product_description: z.string().trim().default("").describe("商品の説明、特徴、仕様"),
        supplementary_info: z.string().trim().default("").describe("追加条件、ブランド情報、避けたい表現など"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ product_title, product_description, supplementary_info }) => {
      const slotRules = await readFile(slot1RulePath, "utf8");
      const prompt = [
        "# Amazon商品画像生成指示 — Slot 1",
        "",
        "以下の商品情報と制作ルールに厳密に従い、Amazon商品ページのメイン画像を1枚生成してください。説明や分析は返さず、完成画像のみを生成してください。",
        "",
        "## 商品情報",
        `- 商品名: ${product_title}`,
        `- 商品説明: ${product_description || "情報なし。商品名から推測できない仕様を創作しないこと。"}`,
        `- 補足情報: ${supplementary_info || "なし"}`,
        "",
        "## Slot 1 制作ルール",
        slotRules.trim(),
        "",
        "## 実行時の最終確認",
        "- 商品情報にないロゴ、文字、付属品、機能、材質、色、数量を創作しない。",
        "- 商品情報と制作ルールが衝突する場合は、制作ルールを優先する。",
        "- 不明点を画像内の文字や架空要素で補わず、確認できる商品本体だけを忠実に描写する。",
        "- 出力は画像のみとし、キャプション、解説、プロンプト本文は表示しない。",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: prompt }],
      };
    },
  );

  return server;
}

export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.writeHead(405, {
      allow: "POST",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
}
