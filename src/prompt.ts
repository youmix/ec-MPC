/**
 * @deprecated Use slots.ts (buildSlotToolResult / buildActionRequired) instead.
 * Kept as thin re-exports so any external import of prompt.js still resolves.
 */
export type { ProductInput } from "./slots.js";
export {
  buildActionRequired as buildChatGptWebActionRequired,
  buildRulesBlock,
  buildSlotToolContent,
  buildSlotToolResult,
} from "./slots.js";

import type { ProductInput, SlotDefinition } from "./slots.js";
import {
  buildActionRequired,
  buildRulesBlock,
  buildSlotToolContent,
} from "./slots.js";

/** @deprecated */
export function buildSlotImageBrief(
  slot1Rules: string,
  input: ProductInput,
): string {
  const slot: SlotDefinition = {
    id: 1,
    toolName: "slot1",
    roleName: "第一訴求画像",
    title: "Slot1 第一訴求画像",
    description: "",
    rules: slot1Rules,
  };
  const { actionRequired, rulesBlock } = buildSlotToolContent(slot, {
    product_title: input.product_title,
    product_description: input.product_description,
    product_supplement: input.product_supplement,
  });
  // Legacy callers expected a single brief string
  return `${actionRequired}\n\n${rulesBlock}`;
}

/** @deprecated */
export function buildHostImageGenerationResult(
  slot1Rules: string,
  input: ProductInput,
): { actionRequired: string; imageBrief: string } {
  const slot: SlotDefinition = {
    id: 1,
    toolName: "slot1",
    roleName: "第一訴求画像",
    title: "Slot1 第一訴求画像",
    description: "",
    rules: slot1Rules,
  };
  return {
    actionRequired: buildActionRequired(slot, input),
    imageBrief: buildRulesBlock(slot),
  };
}
