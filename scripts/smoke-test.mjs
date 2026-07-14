/**
 * Local smoke test: load Slot1 rules, build MCP response, assert contract.
 * Run: node scripts/smoke-test.mjs
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

async function main() {
  // Prefer compiled modules; fall back to asserting rules file content only + dynamic import via node --import tsx
  let buildSlotToolResult;
  let createSlot1Definition;
  let createMcpServer;
  let listToolNames;
  let buildSlotsFromRuleMap;

  try {
    const slotsMod = await import(resolve(root, "dist/src/slots.js"));
    const createMod = await import(resolve(root, "dist/src/create-server.js"));
    const factoryMod = await import(resolve(root, "dist/src/slot-factory.js"));
    buildSlotToolResult = slotsMod.buildSlotToolResult;
    createSlot1Definition = slotsMod.createSlot1Definition;
    createMcpServer = createMod.createMcpServer;
    listToolNames = createMod.listToolNames;
    buildSlotsFromRuleMap = factoryMod.buildSlotsFromRuleMap;
  } catch {
    console.error(
      "dist/ not found or incomplete. Run: npm run build && node scripts/smoke-test.mjs",
    );
    console.error("Or: npx tsx scripts/smoke-test.ts");
    process.exit(1);
  }

  const rules = await readFile(resolve(root, "rules/slot1.md"), "utf8");
  const failures = [];

  // Rule content contract
  const ruleMustInclude = [
    "第一訴求画像",
    "白背景固定は禁止",
    "英語装飾",
    "商品画像保持",
    "MCP自身が外部画像生成APIを呼ぶ",
    "商品検索結果用メイン画像ではありません",
    // Slot1 art-direction quality (layout / sales / hierarchy)
    "画面右側を中心に大きく配置",
    "訴求エリア",
    "主要訴求は1つ",
    "長い説明文を画像へ貼り付けない",
    "かわいい背景に商品と文字を置く",
    "視線誘導",
    // Strategy-first design process
    "第一訴求テーマ",
    "販売戦略とビジュアルコンセプトを先に決め",
    "単に文字を配置してはいけません",
    // Visual concept + title integrity
    "ビジュアルコンセプト",
    "広告コンセプト",
    "一枚の作品として成立",
    "必ずそのまま使用",
    "販売訴求は商品タイトルとは別レイヤー",
    "変更・要約・言い換え・創作",
  ];
  for (const needle of ruleMustInclude) {
    if (!rules.includes(needle)) {
      failures.push(`rules/slot1.md missing: ${needle}`);
    }
  }

  // Forbidden legacy wording that confuses role
  if (/白背景の商品カタログ画像を生成/.test(rules)) {
    failures.push("rules still describe white-bg catalog generation as goal");
  }

  // Must not force center-only product placement as the design goal
  if (/商品を画面中央へ単純配置してください/.test(rules)) {
    failures.push("rules still instruct simple center product placement");
  }

  const slot1 = createSlot1Definition(rules);
  const input = {
    product_title: "トリケラトプス ぬいぐるみ",
    product_description: "ここに商品説明全文",
    product_supplement: "ここに任意の補足情報",
  };

  const result = buildSlotToolResult(slot1, input);
  const fullText = result.content.map((c) => c.text).join("\n---\n");

  const responseMustInclude = [
    "現在のChatGPT会話に添付された商品画像を使用してください",
    "ユーザーが入力した商品タイトル、商品説明、商品補足を使用してください",
    "ChatGPT Webの画像生成機能を使用し、完成した1:1の商品訴求画像を1枚生成してください",
    "画像生成を実行してください",
    "プロンプトや説明文だけを返して終了しないでください",
    "トリケラトプス ぬいぐるみ",
    "ここに商品説明全文",
    "ここに任意の補足情報",
    "Slot1 固定ルール",
  ];
  for (const needle of responseMustInclude) {
    if (!fullText.includes(needle)) {
      failures.push(`tool response missing: ${needle}`);
    }
  }

  // Must NOT instruct white background as fixed design
  if (/背景は必ず白|白背景固定で作成|white background only/i.test(fullText)) {
    failures.push("response still forces white background");
  }

  const slots = buildSlotsFromRuleMap({ 1: rules });
  const tools = listToolNames(slots);
  if (!tools.includes("slot1")) {
    failures.push("tool list missing slot1");
  }
  if (!tools.includes("generate_slot_image")) {
    failures.push("tool list missing generate_slot_image (compat)");
  }
  if (tools.includes("preview_slot_image_brief")) {
    failures.push("preview_slot_image_brief should be removed (prompt-only anti-pattern)");
  }

  // Server boots
  const server = createMcpServer({ slots });
  if (!server) failures.push("createMcpServer returned falsy");

  if (failures.length) {
    console.error("SMOKE TEST FAILED:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }

  console.log("SMOKE TEST OK");
  console.log(" tools:", tools.join(", "));
  console.log(" response chars:", fullText.length);
  console.log(" sample action head:");
  console.log(result.content[0].text.split("\n").slice(0, 12).join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
