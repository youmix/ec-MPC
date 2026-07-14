import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildSlotToolResult,
  listToolNames,
  type SlotDefinition,
} from "./slots.js";

export type CreateMcpServerOptions = {
  /** 有効な Slot 定義（現在は Slot1。将来 Slot2〜6 を追加） */
  slots: SlotDefinition[];
};

const productInputSchema = {
  product_title: z
    .string()
    .trim()
    .min(1)
    .describe("商品タイトル（画像上部に大きく配置。無視禁止）"),
  product_description: z
    .string()
    .trim()
    .min(1)
    .describe(
      "商品説明。事実として確認できる特徴の抽出元。ここにない性能・付属品は創作禁止",
    ),
  product_supplement: z
    .string()
    .trim()
    .default("")
    .describe("商品補足（任意の追加事実）。なければ空文字"),
} as const;

function registerSlotTool(server: McpServer, slot: SlotDefinition): void {
  server.registerTool(
    slot.toolName,
    {
      title: slot.title,
      description: slot.description,
      inputSchema: productInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) =>
      buildSlotToolResult(slot, {
        product_title: args.product_title,
        product_description: args.product_description,
        product_supplement: args.product_supplement,
      }),
  );
}

/**
 * Amazon Slot MCP。
 * Slot 固定ルールを返し、ChatGPT Web に完成画像生成を要求する。
 * MCP 自身は画像生成APIを呼び出さない。
 */
export function createMcpServer(options: CreateMcpServerOptions): McpServer {
  const { slots } = options;

  if (slots.length === 0) {
    throw new Error("At least one slot definition is required");
  }

  const server = new McpServer({
    name: "amazon-slot-image",
    version: "0.8.0",
  });

  for (const slot of slots) {
    registerSlotTool(server, slot);
  }

  // 後方互換: 既存コネクタが generate_slot_image を呼んでも Slot1 と同じ結果
  const slot1 = slots.find((s) => s.id === 1);
  if (slot1) {
    server.registerTool(
      "generate_slot_image",
      {
        title: "Slot1 第一訴求画像（互換エイリアス）",
        description: [
          "slot1 ツールの後方互換エイリアス。",
          "ユーザーが Slot1 または第一訴求画像を求めたときは slot1 を優先して呼ぶ。",
          "入力は商品タイトル・商品説明・商品補足のみ。",
          "ChatGPT Webの画像生成で1:1完成画像を1枚生成すること。プロンプトのみ返却禁止。",
        ].join(""),
        inputSchema: productInputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      async (args) =>
        buildSlotToolResult(slot1, {
          product_title: args.product_title,
          product_description: args.product_description,
          product_supplement: args.product_supplement,
        }),
    );
  }

  return server;
}

export { listToolNames };
export type { SlotDefinition, ProductInput } from "./slots.js";
