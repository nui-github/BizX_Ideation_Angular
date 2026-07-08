# Mock Data

Isolated, fully-typed mock arrays — the single source of truth for prototyping and simulated
states until real backend APIs exist. See [`/docs/PROJECT_RULES.md`](../../docs/PROJECT_RULES.md) §2.

**Rules (enforced by convention, not tooling — please respect them):**

1. Only `app/core/services/*.ts` may import from this folder.
2. Components must never import mock data directly — always go through a service that returns
   an `Observable` (e.g. `return of(MOCK_AGENTS)`), so swapping to a real HTTP call later is a
   one-line change inside the service.
3. Keep dates/timestamps current-year (see rule in `PROJECT_RULES.md` §2, "Data Currency").

| File | Consumed by |
|---|---|
| `agents.mock.ts` | `core/services/agent.service.ts` |
| `tracking.mock.ts` | `core/services/tracking.service.ts` (includes `MOCK_COMPARISON_JOBS`, used by `dashboard.component.ts`) |
| `workflows.mock.ts` | `core/services/workflow.service.ts` |
