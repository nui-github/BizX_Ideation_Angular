# BizX — Data Comparison

A system for document tracking, processing, and comparison, with AI-powered extraction, workflow
management, and audit logs.

## Repo layout

| Folder | What it is |
|---|---|
| [`/prototype`](prototype) | React + Vite design prototype (AI Studio "vibe design" output) — visual/UX reference only, not shipped |
| [`/angular`](angular) | The real Angular app the dev team builds out — see [`angular/README.md`](angular/README.md) |
| [`/docs`](docs) | Architecture, project rules, data models, design system — **read [`docs/HANDOFF.md`](docs/HANDOFF.md) first** |

## Quick start

```bash
# Design prototype (React/Vite) — reference only
cd prototype && npm install && npm run dev      # http://localhost:3000

# Angular app — the actual deliverable
cd angular && npm install && npm start          # http://localhost:4200
```

Each project has its own `package.json`/`node_modules`; install separately.

## Where to start

If you're a designer iterating on the UI, work in `/prototype`.
If you're a developer building the real app, start with [`docs/HANDOFF.md`](docs/HANDOFF.md) — it
maps every prototype component to its Angular target and lists known gaps.
