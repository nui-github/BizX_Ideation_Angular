# Project Rules & Guidelines

## 1. Tech Stack Requirements
- **Framework:** Angular
- **UI Component Library:** `ng-zorro-antd` (Ant Design for Angular). 
  - *Rule:* Do not use Tailwind for structural layout where `ng-zorro-antd` provides a native alternative (e.g. use `<nz-row>`, `<nz-col>`, `<nz-space>`, `<nz-layout>`, `<nz-card>` primarily).
- **Styling:** SCSS (Component-scoped). Avoid external CSS frameworks. Customizations should be scoped within the Angular component's `.scss` file.
- **Icons:** Lucide Icons (e.g., `lucide-angular`).

## 2. Mock Data & State Management Principles
- **Strict Separation (`mock-data/`):** All mocked arrays, hardcoded initial states, and JSON objects MUST be isolated in a dedicated `mock-data/` directory (e.g., `mock-data/dashboard.mock.ts`). Do not place raw arrays directly inside component logic files.
- **Data Encapsulation:** UI Components (`.ts`) must **never** import mock data directly from the `mock-data/` artifacts. 
- **The Service Bridge:** Create Angular `@Injectable()` Services that act as the *only* structures allowed to import constants from `mock-data/`. 
  - These services must wrap and return the mock data using RxJS Observables (e.g., `return of(MOCK_DATA);`).
  - Components must `subscribe` to these observables to consume data. This ensures the component logic assumes asynchronous behavior from day one, making swapping to real HTTP endpoints later completely seamless.
- **Data Currency:** Ensure all mock data and simulated records reflect the current year (e.g., 2026).

## 3. General Principles
- **Code Quality:** Write clean, readable, well-organized code. Ensure strict Separation of Concerns (SoC) between view logic (components) and business/data logic (services).
- **Localization:** The platform supports multi-language display (currently Thai `TH` and English `EN`). Use variable text rendering based on the active locale state instead of hardcoded raw strings in templates.
- **Clean & Human-Readable Labeling:** Avoid internal jargon or confusing technical abbreviations in user-facing tooltips and UI elements (e.g. use "จำนวนข้อมูลที่ตรงตามเงื่อนไข" instead of "จำนวนข้อมูลที่ตรงตามเงื่อนไข (Synonym)" in user tooltips to keep terms humble, intuitive, and accessible).
- **Graceful Error Handling:** Interface elements must gracefully handle empty states, processing states, or missing data without breaking the layout. 

## 4. Documentation Standard
- For every code block, component, or configuration file edited, clearly maintain the File Path at the top of the file/block (e.g., `// src/app/features/dashboard/dashboard.component.ts`) to ensure all developers understand the exact context and location of the source.
