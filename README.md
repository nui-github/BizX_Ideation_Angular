# BizX — Data Comparison

A system for document tracking, processing, and comparison, with AI-powered extraction, workflow
management, and audit logs.

The **Angular app lives at the repo root** (like `Amethyst_Angular`) and is the real deliverable.
The React/Vite prototype under [`/prototype`](prototype) is being ported into it feature by feature —
see [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md).

## Repo layout

| Path | What it is |
|---|---|
| `angular.json`, `package.json`, `src/`, `public/` | The Angular app (root) — see [`ANGULAR.md`](ANGULAR.md) |
| [`/prototype`](prototype) | React + Vite design prototype — source of truth being ported to Angular; still the live client demo until the port finishes |
| [`/docs`](docs) | Architecture, project rules, data models, design system, [migration plan](docs/MIGRATION_PLAN.md) |

## Quick start

```bash
# Angular app (root) — the deliverable
npm install && npm start                          # http://localhost:4200

# React design prototype (reference / current live demo)
cd prototype && npm install && npm run dev        # http://localhost:3000
```

## Deployment

Vercel Root Directory = repo root. The root [`vercel.json`](vercel.json) currently builds the
`prototype/` React app (the working client demo). Once the Angular port is complete, its
`buildCommand`/`outputDirectory` will be switched to the Angular build (see migration plan, Phase 3).
