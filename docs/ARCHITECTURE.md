# Architecture Guidelines

## 1. Core Architecture Strategy
The application is built on Angular and utilizes `ng-zorro-antd` for the UI foundation. The architecture mandates a strict separation of concerns to ensure maintainability, testability, and a clear path if backend APIs are introduced later.

## 2. Directory & Module Structure
- **`mock-data/`**: A fully isolated directory holding constants, JSON data, and mock objects. Provides a single source of truth for prototyping and simulated states.
- **`services/`**: The Core Data Abstraction layer. `@Injectable()` services fetch data (from `mock-data/` or future APIs) and expose them via RxJS Observables. It handles all asynchronous operations and data transformations.
- **`components/` (or `features/`):** The isolated Presentation layer. These Angular components consume data exclusively by subscribing to services. They use `ng-zorro-antd` structural and UI components (`<nz-layout>`, `<nz-table>`, etc.) for rendering and emitting user interactions.

## 3. Domain Entities (Logistics Data Comparison)
The central business logic revolves around verifying extracted AI document data against master sets.

### 3.1 Workflow Entities
- **Jobs:** Encompass multiple documents related to a single logistic transaction.
  - *Statuses:*
    - `NEW`: Waiting for files (รอไฟล์ครบ)
    - `PENDING`: All files uploaded but not yet extracted (รอดำเนินการ)
    - `PROCESSING`: AI is currently extracting/comparing data (กำลังเปรียบเทียบข้อมูล)
    - `REVIEW`: AI found mismatches requiring manual review (รอตรวจสอบ)
    - `READY`: All documents are matched (เสร็จสมบูรณ์)
    - `DONE`: Data fully exported to the next system (ส่งออกแล้ว)
- **Documents:** Individual files (Invoice, Packing List, B/L, etc.).
  - *Statuses:* `MISSING` -> `RECEIVED` -> `EXTRACTING` (AI OCR) -> `OCR_DONE` -> (`MATCHED` / `MISMATCHED`).

### 3.2 State Transitions & Business Logic
- **Automatic Status Calculation:** Job status is automatically derived from the collective statuses of its documents. No manual "Lock" button is required; `MATCHED` documents are automatically considered verified.
- **Confidence Scoring:** AI analysis provides confidence percentages which impact document visual grouping and required attention.
- **Mismatch Overrides:** Users can manually override AI mismatches (or synonyms). Synonyms map directly to predefined rules.
