/**
 * Amazon Slot 定義と、ChatGPT Web 向けレスポンス組み立て。
 * MCP は画像生成APIを呼ばず、Slot固定ルール + 実行指示のみを返す。
 */

export type SlotId = 1 | 2 | 3 | 4 | 5 | 6;

export type ProductInput = {
  product_title: string;
  product_description: string;
  /** 商品補足（任意） */
  product_supplement?: string;
};

export type SlotDefinition = {
  id: SlotId;
  /** MCP ツール名（例: slot1） */
  toolName: string;
  /** 日本語の役割名（例: 第一訴求画像） */
  roleName: string;
  /** ツール title */
  title: string;
  /** ツール description（ChatGPT がツール選択時に参照） */
  description: string;
  /** Slot 固定ルール全文 */
  rules: string;
};

/**
 * 将来 Slot2〜6 を rules/slotN.md から同じ形で追加する。
 */
export function createSlotDefinition(
  id: SlotId,
  roleName: string,
  rules: string,
  descriptionLines: string[],
): SlotDefinition {
  return {
    id,
    toolName: `slot${id}`,
    roleName,
    title: `Slot${id} ${roleName}`,
    description: descriptionLines.join(""),
    rules: rules.trim(),
  };
}

export function createSlot1Definition(rules: string): SlotDefinition {
  return createSlotDefinition(1, "第一訴求画像", rules, [
    "Amazon商品ページ用 Slot1（第一訴求画像）の固定ルールを返し、ChatGPT Webの画像生成で完成画像を作らせるツール。",
    "ユーザーが「Slot1」と指定したとき、または第一訴求画像が必要なときに呼ぶ。",
    "入力は商品タイトル・商品説明・商品補足のみ。長い定型プロンプトは不要。",
    "商品実物画像は現在のChatGPT会話への添付を使用する。",
    "MCPは画像を生成しない。ツール結果のSlot1ルールに従い、ChatGPT Webの画像生成機能で1:1完成画像を1枚生成すること。",
    "プロンプトや説明文だけを返して終了してはならない。",
  ]);
}

/**
 * ChatGPT Web が実行すべき必須アクション（全 Slot 共通の骨格 + Slot 固有名）。
 */
export function buildActionRequired(slot: SlotDefinition, input: ProductInput): string {
  const supplement = (input.product_supplement ?? "").trim();

  return [
    `【必須アクション — Slot${slot.id} ${slot.roleName}】`,
    "",
    "現在のChatGPT会話に添付された商品画像を使用してください。",
    "ユーザーが入力した商品タイトル、商品説明、商品補足を使用してください。",
    `上記 Slot${slot.id} ルールに従って構成してください。`,
    "ChatGPT Webの画像生成機能を使用し、完成した1:1の商品訴求画像を1枚生成してください。",
    "画像生成を実行してください。",
    "プロンプトや説明文だけを返して終了しないでください。",
    "",
    "## 今回の商品情報",
    "",
    `### 商品タイトル`,
    input.product_title.trim(),
    "",
    `### 商品説明`,
    input.product_description.trim(),
    "",
    `### 商品補足`,
    supplement || "（なし）",
    "",
    "## 実行手順",
    "",
    "1. チャットに添付された商品実物画像を基準にする（形状・柄・色・素材感・ロゴ等を変更しない）",
    "2. 商品タイトル・商品説明・商品補足から事実のみを読み取る（創作禁止）",
    `3. 下の Slot${slot.id} 固定ルール全文に従いレイアウトと訴求を構成する`,
    "4. ChatGPT Web の画像生成機能を起動し、完成した正方形（1:1）画像をちょうど1枚生成する",
    "5. その完成画像をユーザーへの返答として表示する",
    "",
    "## 禁止（これだけでターンを終了しない）",
    "",
    "- プロンプトやルールの再掲だけで終わる",
    "- 解析結果・チェックリストだけで終わる",
    "- 元画像をそのまま返すだけ",
    "- 白背景の商品単体画像（Amazon検索メイン画像風）として処理する",
    "- 外部画像生成APIを別途呼ぶ（ChatGPT Webの画像生成のみ使用）",
  ].join("\n");
}

/**
 * Slot 固定ルール全文を ChatGPT に渡すブロック。
 */
export function buildRulesBlock(slot: SlotDefinition): string {
  return [
    `# Slot${slot.id} 固定ルール（全面適用）`,
    "",
    slot.rules,
  ].join("\n");
}

export function buildSlotToolContent(
  slot: SlotDefinition,
  input: ProductInput,
): { actionRequired: string; rulesBlock: string; finalReminder: string } {
  return {
    actionRequired: buildActionRequired(slot, input),
    rulesBlock: buildRulesBlock(slot),
    finalReminder: [
      "【再確認】",
      `Slot${slot.id}（${slot.roleName}）ルールと商品情報・添付画像に従い、今すぐ ChatGPT Web の画像生成で完成した1:1画像を1枚生成し、ユーザーに表示してください。`,
      "テキストの再掲やプロンプトの提示だけでターンを終了しないでください。",
    ].join("\n"),
  };
}

/** ツール応答用 content 配列 */
export function buildSlotToolResult(
  slot: SlotDefinition,
  input: ProductInput,
): { content: Array<{ type: "text"; text: string }> } {
  const { actionRequired, rulesBlock, finalReminder } = buildSlotToolContent(
    slot,
    input,
  );
  return {
    content: [
      { type: "text" as const, text: actionRequired },
      { type: "text" as const, text: rulesBlock },
      { type: "text" as const, text: finalReminder },
    ],
  };
}

export function listToolNames(slots: SlotDefinition[]): string[] {
  const names = slots.map((s) => s.toolName);
  // 後方互換: Slot1 がある場合は旧ツール名も公開
  if (slots.some((s) => s.id === 1)) {
    names.push("generate_slot_image");
  }
  return names;
}
