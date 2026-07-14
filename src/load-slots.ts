import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildKnownSlot } from "./slot-factory.js";
import type { SlotDefinition, SlotId } from "./slots.js";

export { buildSlotsFromRuleMap, buildKnownSlot } from "./slot-factory.js";

/**
 * rules/slotN.md を読み込み Slot 定義を構築する（Node / Vercel 用）。
 */
export async function loadSlotsFromRulesDir(
  rulesDir: string,
): Promise<SlotDefinition[]> {
  const entries = await readdir(rulesDir);
  const slotFiles = entries
    .map((name) => {
      const match = /^slot(\d+)\.md$/i.exec(name);
      if (!match) return null;
      const id = Number.parseInt(match[1], 10);
      if (id < 1 || id > 6) return null;
      return { id: id as SlotId, file: name };
    })
    .filter((x): x is { id: SlotId; file: string } => x !== null)
    .sort((a, b) => a.id - b.id);

  const slots: SlotDefinition[] = [];

  for (const { id, file } of slotFiles) {
    const rules = await readFile(join(rulesDir, file), "utf8");
    const def = buildKnownSlot(id, rules);
    if (def) slots.push(def);
  }

  if (slots.length === 0) {
    throw new Error(`No slot rules found under ${rulesDir}`);
  }

  return slots;
}
