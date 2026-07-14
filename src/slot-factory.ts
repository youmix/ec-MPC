import {
  createSlot1Definition,
  type SlotDefinition,
  type SlotId,
} from "./slots.js";

/**
 * 既知 Slot の定義ビルダ。
 * Slot2〜6 を追加するときはここに createSlotNDefinition を足す。
 */
export function buildKnownSlot(
  id: SlotId,
  rules: string,
): SlotDefinition | null {
  switch (id) {
    case 1:
      return createSlot1Definition(rules);
    // case 2: return createSlot2Definition(rules);
    // case 3: return createSlot3Definition(rules);
    // case 4: return createSlot4Definition(rules);
    // case 5: return createSlot5Definition(rules);
    // case 6: return createSlot6Definition(rules);
    default:
      return null;
  }
}

/**
 * Worker などインラインでルール文字列を渡す場合（filesystem 不要）。
 */
export function buildSlotsFromRuleMap(
  rulesById: Partial<Record<SlotId, string>>,
): SlotDefinition[] {
  const slots: SlotDefinition[] = [];
  for (const id of [1, 2, 3, 4, 5, 6] as SlotId[]) {
    const rules = rulesById[id];
    if (!rules) continue;
    const def = buildKnownSlot(id, rules);
    if (def) slots.push(def);
  }
  if (slots.length === 0) {
    throw new Error("No slot rules provided");
  }
  return slots;
}
