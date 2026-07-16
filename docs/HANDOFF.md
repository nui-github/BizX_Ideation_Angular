# Handoff — Design Prototype → Angular Build

> ⚠️ **Snapshot notice — read before trusting this doc**
> This document (mapping table, "Resolved"/"Open items" sections) reflects `/prototype` as of
> **2026-07-16**. Vibe design on `/prototype` is still ongoing and will keep adding/changing
> components after this date, while the Angular app only gets the features listed as "Ported"
> below (see rationale below). **Before actually handing off to the dev team**, re-scan
> `/prototype/components/` against the mapping table and refresh anything that's drifted — do not
> assume this table is still accurate.
>
> Superseded structure note: this doc originally described `/angular` as a separate sibling folder
> next to `/prototype`. As of the Phase 0 restructuring in [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md),
> the Angular app lives at the **repo root** instead (`Amethyst_Angular`-style) — paths below have
> been updated to match. See `MIGRATION_PLAN.md` for the phased porting strategy this table feeds into.

This repo now has two top-level parts:

```
/            The Angular app (angular.json, package.json, src/, public/) — the real deliverable
/prototype   React + Vite design prototype (source of visual truth — "vibe design" output)
/docs        Architecture, rules, data models, design system, migration plan (this file included)
```

The prototype is not meant to ship. It exists to iterate on UX/visuals fast. The Angular app is
the real deliverable — build every feature there, using the prototype only as a visual/behavioral
reference and `/docs` as the binding spec.

**Why the Angular app doesn't track every prototype iteration:** trying to keep it in sync with
every prototype tweak would be wasted effort — the prototype's shape will keep changing until
design is finalized. Instead, the Angular app only picks up features once they're ported per
`MIGRATION_PLAN.md`'s phase list, and this doc's mapping table is refreshed periodically (not
after every prototype commit) to track drift.

## Read these first

1. [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) — phased plan for the Angular-at-root restructuring and feature-by-feature port order
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — layering (mock-data → services → components) & domain entities
3. [`PROJECT_RULES.md`](PROJECT_RULES.md) — tech stack rules (ng-zorro-antd, SCSS, Lucide icons, localization, mock-data discipline)
4. [`DATA_MODELS.md`](DATA_MODELS.md) — canonical TypeScript interfaces (already mirrored in `src/app/core/models/types.model.ts`)
5. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — colors, typography, status semantics (already wired into `src/styles/theme.less`)

## What's already ported and working

| Angular path (repo root) | Status | Notes |
|---|---|---|
| `src/app/core/models/types.model.ts` | ✅ Ported | Matches `DATA_MODELS.md` |
| `src/app/core/services/agent.service.ts` | ✅ Ported | Wraps `mock-data/agents.mock.ts` |
| `src/app/core/services/tracking.service.ts` | ✅ Ported | Wraps `mock-data/tracking.mock.ts` |
| `src/app/core/services/workflow.service.ts` | ✅ Ported | Wraps `mock-data/workflows.mock.ts` |
| `src/app/features/dashboard` | ✅ Ported, standalone, routed at `/data-comparison/jobs` | Clean — no Tailwind, mock data wired |
| `src/app/features/exdoc/workflow-builder` | ✅ Ported, standalone, routed at `/exdoc/workflow-builder` | This is the **generic** builder (`WorkflowBuilder.tsx`) — not the Data Comparison one, see below |
| `src/app/layout/shell` | ⚠️ Partial | Sidebar/header structure only — nav tree, permissions, and language toggle from `Layout.tsx` not yet ported |

## What still needs porting

Every row below is a prototype component with no Angular equivalent yet. Suggested target paths
follow the `src/app/features/<area>/<name>.component.ts` convention already used by `dashboard` and
`workflow-builder` — feel free to adjust as the real routing/IA is finalized.

| Prototype source | Suggested Angular target | Sidebar area (per current design) |
|---|---|---|
| `components/UploadPage.tsx` | `features/exdoc/upload-page` | ExDoc → อัปโหลดไฟล์เอกสาร |
| `components/TrackingPage.tsx` | `features/exdoc/tracking-page` | ExDoc → รายการการติดตามเอกสาร |
| `components/ExtractionView.tsx` | `features/exdoc/extraction-view` | ExDoc (detail view) |
| `components/AgentList.tsx` | `features/agents/agent-list` | (agent.service.ts already exists) |
| `components/AgentForm.tsx` | `features/agents/agent-form` | (agent.service.ts already exists) |
| `components/CreateJobModal.tsx` | `features/data-comparison/create-job-modal` | Data Comparison → รายการงาน (modal) |
| `components/GenerateReportModal.tsx` | `features/data-comparison/generate-report-modal` | Data Comparison → รายการงาน (สร้างรายงาน drawer) — new since the last scan: row select/delete/bulk-action toolbar, per-file report management |
| `components/ComparisonWorkflow.tsx` | `features/data-comparison/comparison-workflow` | Data Comparison |
| `components/DataComparisonWorkflowBuilder.tsx` | `features/data-comparison/workflow-builder` | Data Comparison → จัดการเวิร์กโฟลว์ (**not started** — 4,248 lines, the biggest single port in this list; do not confuse with the already-ported generic builder at `features/exdoc/workflow-builder`) |
| `components/ManageRule.tsx` | `features/data-comparison/rules/manage-rule` | Data Comparison → Compare rules |
| `components/RuleList.tsx` | `features/data-comparison/rules/rule-list` | Data Comparison → Compare rules |
| `components/RuleMatrix.tsx` | `features/data-comparison/rules/rule-matrix` | Data Comparison → Compare rules |
| `components/DocTypeMaster.tsx` | `features/settings/doc-type-master` | Settings |
| `components/LabelSchemaSettings.tsx` | `features/settings/label-schema-settings` | Settings |
| `components/MasterDataSettings.tsx` | `features/settings/master-data-settings` | Settings |
| `components/JobPresetSettings.tsx` | `features/settings/job-preset-settings` | Settings |
| `components/WorkflowList.tsx` | `features/exdoc/workflow-list` | ExDoc / generic workflow list |
| `components/Tooltip.tsx` | `shared/tooltip` | Cross-cutting |

Follow the same pattern for each: add a `src/mock-data/*.mock.ts` file (if new data is needed), a
`src/app/core/services/*.service.ts` wrapping it in an `Observable`, then a standalone
`src/app/features/**/*.component.ts` that subscribes to the service. Register icons used by the new
template in `shared/icons.provider.ts` (Lucide icons are tree-shaken by name — components will
fail at runtime with "icon not found" if you forget this step).

## Resolved before handoff

These were caught while scaffolding and are already fixed — noted here so the reasoning isn't lost:

- **Tailwind in `dashboard.component.ts`**: `getDocStatusBadgeClass`/`getJobStatusBadgeClass`
  returned Tailwind utility strings but were never actually called from the template (the template
  already uses the correct SCSS classes — `.status-{status}`, `.state-{status}` in
  `dashboard.component.scss`). They were dead code, not a live violation — deleted outright rather
  than "fixed", along with the now-unused `ComparisonDocStatus` import.
- **`mock-data/dashboard.mock.ts` (`MOCK_DASHBOARD_JOBS`) was dead code** — nothing imported it.
  `dashboard.component.ts` already reads jobs via `tracking.service.ts` → `MOCK_COMPARISON_JOBS` in
  `tracking.mock.ts`, which is the real, wired source. Deleted the orphaned file rather than wiring
  a duplicate.
- **Workflow builder mismatch**: confirmed by line count and imports that `WorkflowBuilder.tsx`
  (1,122 lines, generic template-mapping builder) and `DataComparisonWorkflowBuilder.tsx`
  (4,282 lines, imports `DEFAULT_SCHEMAS` from `LabelSchemaSettings.tsx`, has Data-Comparison-specific
  doc types/node types) are unrelated components. The scaffold had wired the generic one to the
  `/data-comparison/workflow-builder` route by mistake. Fixed: moved the generic builder to
  `features/exdoc/workflow-builder` routed at `/exdoc/workflow-builder` (where it actually belongs),
  and left `/data-comparison/workflow-builder` unrouted with the corresponding sidebar item disabled
  until `DataComparisonWorkflowBuilder.tsx` is ported — see the mapping table above. **Porting that
  4,282-line component itself is still open work**, not something resolved here.

## Open items

- **Icon system split**: `layout/shell` uses ng-zorro's built-in icon set (`nzIcon="folder"` on
  `nz-submenu`/`nz-menu-item`, since that's the API those directives expose) while
  `PROJECT_RULES.md` mandates Lucide icons elsewhere. This is a reasonable, common split (nz-menu
  chrome vs. Lucide for content) — but call it out explicitly if the team wants one icon system
  everywhere.
- **`provideNzI18n(en_US)` is a placeholder** in `app.config.ts`. ng-zorro-antd doesn't ship an
  official Thai locale; if TH-language date pickers/pagination labels are needed, write a custom
  `NzI18nInterface` locale (see ng-zorro-antd i18n docs) rather than relying on the app's own
  `Language` toggle, which only affects app-authored copy, not ng-zorro's internal component text.

## Running things

```bash
npm install && npm start                          # Angular app (root), the real deliverable, http://localhost:4200
cd prototype && npm install && npm run dev        # React design prototype (reference), http://localhost:3000
```

The two projects have independent `package.json`/`node_modules` — installing one does not
install the other.
