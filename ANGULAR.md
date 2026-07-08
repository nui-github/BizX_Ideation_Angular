# BizX Data Comparison — Angular App

This is the production Angular application, scaffolded to match the design prototype in
[`/prototype`](../prototype) and the specs in [`/docs`](../docs).

## Stack

- Angular 18 (standalone components, no `NgModule`)
- `ng-zorro-antd` for UI primitives, themed via `src/styles/theme.less`
- `lucide-angular` for icons (see `src/app/shared/icons.provider.ts`)
- SCSS, component-scoped (see [`/docs/PROJECT_RULES.md`](../docs/PROJECT_RULES.md))

## Getting started

```bash
npm install
npm start        # ng serve, http://localhost:4200
npm run build    # production build
```

## Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/       # shared TS interfaces & enums (types.model.ts)
│   │   └── services/     # @Injectable data services — the ONLY layer allowed
│   │                      # to import from mock-data/ (see PROJECT_RULES.md §2)
│   ├── features/         # one folder per routed feature/page
│   │   ├── dashboard/                    # Data Comparison → Job board
│   │   └── exdoc/workflow-builder/       # ExDoc → generic workflow builder
│   │                                      # (NOT the Data Comparison one — that's still unported, see HANDOFF.md)
│   ├── layout/
│   │   └── shell/        # sidebar + header shell hosting <router-outlet>
│   ├── shared/            # cross-feature providers/components (icons, tooltip, etc.)
│   ├── app.component.ts
│   ├── app.config.ts      # providers: router, animations, ng-zorro i18n, icons
│   └── app.routes.ts
├── environments/
├── styles/
│   └── theme.less         # ng-zorro variable overrides — brand colors live here
├── styles.scss            # global resets only; component styles stay in components
├── index.html
└── main.ts
```

## What's already wired up vs. what's left

`features/dashboard` and `features/exdoc/workflow-builder` are ported from the prototype and are
functional (services + mock data + components). Everything else in the prototype's
`components/` folder still needs to be ported as its own `features/*` folder.

See **[`/docs/HANDOFF.md`](../docs/HANDOFF.md)** for the full prototype-component → Angular-feature
mapping, what was already resolved during scaffolding, and the mock-data → service → component
data flow convention to follow for new features.
