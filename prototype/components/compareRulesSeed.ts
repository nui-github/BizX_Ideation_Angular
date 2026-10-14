// Seed + one-time upgrade for the Incoterm "value groups" demo rule that lives on the Shipping
// Doc Matching compare rule. Shared by the Manage rule page (which edits the rules) and Data
// Comparison (which reads them), so whichever opens first leaves the saved rules in the same
// shape.

export const COMPARE_RULES_STORAGE_KEY = 'bizx_compare_rules_v12';
const SEEDED_FLAG_KEY = 'bizx_vg_incoterm_seeded_v2';

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

// Rules saved before the demo existed: swap the Shipping Doc Matching Incoterm row over to it
// (B/L becomes the main document, Invoice and Packing List are judged by the groups) and undo
// the stray value-groups cell an earlier test left on Port of Discharge. Runs once per browser,
// so later edits made in the UI are never overwritten.
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
      return {
        ...rule,
        parts: rule.parts.map((part: any) => ({
          ...part,
          rows: part.rows.map((row: any) => {
            if (row.id === 'ship-h6') {
              return { ...row, values: row.values.map((v: any) => (v?.type === 'VALUE_GROUPS' ? { type: 'NONE' } : v)) };
            }
            if (row.id === 'ship-f3') {
              const values = [...row.values];
              values[0] = { ...makeIncotermValueGroups(blLabel), schemaId: 'ls-inv' };
              values[1] = { ...makeIncotermValueGroups(blLabel), schemaId: 'ls-pl' };
              values[2] = { type: '', schemaId: 'ls-bl', schemaField: 'Incoterm', isMain: true };
              return { ...row, values };
            }
            return row;
          })
        }))
      };
    });
    localStorage.setItem(COMPARE_RULES_STORAGE_KEY, JSON.stringify(migrated));
    localStorage.setItem(SEEDED_FLAG_KEY, '1');
  } catch {
    // storage unavailable — nothing to upgrade
  }
};
