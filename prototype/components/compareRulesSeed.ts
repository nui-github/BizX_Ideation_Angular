// Seed + one-time upgrade for the Incoterm "value groups" demo rule that lives on the Shipping
// Doc Matching compare rule. Shared by the Manage rule page (which edits the rules) and Data
// Comparison (which reads them), so whichever opens first leaves the saved rules in the same
// shape.

export const COMPARE_RULES_STORAGE_KEY = 'bizx_compare_rules_v12';
const SEEDED_FLAG_KEY = 'bizx_vg_incoterm_seeded_v3';

// What the B/L says about freight (COLLECT / PREPAID) decides which Incoterms the Invoice and the
// Packing List may show.
export const makeIncotermValueGroups = (blLabel: string) => ({
  type: 'VALUE_GROUPS',
  schemaField: 'Incoterm',
  vgRefDoc: blLabel,
  vgRefField: 'Incoterm',
  vgCases: [
    { id: 'vg-collect', when: ['COLLECT', 'FREIGHT COLLECT'], accept: ['EXW', 'FCA', 'FOB'] },
    { id: 'vg-prepaid', when: ['PREPAID', 'FREIGHT PREPAID'], accept: ['CIF', 'CIP', 'CFR'] }
  ],
  vgMatchMode: 'EXACT',
  vgElse: 'NORMAL'
});

// Rules saved before the demo existed (or with the Incoterm row still in the Footer): put the
// Shipping Doc Matching Incoterm row in the Header section with the value-groups cells on it
// (B/L is the main document, Invoice and Packing List are judged by the groups). Runs once per
// browser, so later edits made in the UI are never overwritten.
export const ensureIncotermValueGroupsSeeded = (blLabel: string): void => {
  try {
    if (localStorage.getItem(SEEDED_FLAG_KEY) === '1') return;
    const raw = localStorage.getItem(COMPARE_RULES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SEEDED_FLAG_KEY, '1');
      return;
    }
    const migrated = (JSON.parse(raw) as any[]).map(rule => {
      if (rule?.name !== 'Shipping Doc Matching') return rule;
      // Pull the Incoterm row out of wherever it sits and put it back in the Header section,
      // right after Port of Discharge — the same place Data Comparison shows it.
      let incoterm: any = null;
      const withoutIncoterm = rule.parts.map((part: any) => ({
        ...part,
        rows: part.rows
          .filter((row: any) => {
            if (row.id !== 'ship-f3') return true;
            incoterm = row;
            return false;
          })
          .map((row: any) => {
            // undo the stray value-groups cell an earlier test left on Port of Discharge
            if (row.id !== 'ship-h6') return row;
            return { ...row, values: row.values.map((v: any) => (v?.type === 'VALUE_GROUPS' ? { type: 'NONE' } : v)) };
          })
      }));
      if (!incoterm) return rule;
      const values = [...incoterm.values];
      if (values[0]?.type !== 'VALUE_GROUPS') {
        values[0] = { ...makeIncotermValueGroups(blLabel), schemaId: 'ls-inv' };
        values[1] = { ...makeIncotermValueGroups(blLabel), schemaId: 'ls-pl' };
        values[2] = { type: '', schemaId: 'ls-bl', schemaField: 'Incoterm', isMain: true };
      }
      const placed = { ...incoterm, values };
      const targetPartIdx = Math.max(0, withoutIncoterm.findIndex((part: any) => part.rows.some((row: any) => row.id === 'ship-h6')));
      return {
        ...rule,
        parts: withoutIncoterm.map((part: any, idx: number) => {
          if (idx !== targetPartIdx) return part;
          const h6Idx = part.rows.findIndex((row: any) => row.id === 'ship-h6');
          const insertAt = h6Idx === -1 ? part.rows.length : h6Idx + 1;
          return { ...part, rows: [...part.rows.slice(0, insertAt), placed, ...part.rows.slice(insertAt)] };
        })
      };
    });
    localStorage.setItem(COMPARE_RULES_STORAGE_KEY, JSON.stringify(migrated));
    localStorage.setItem(SEEDED_FLAG_KEY, '1');
  } catch {
    // storage unavailable — nothing to upgrade
  }
};
