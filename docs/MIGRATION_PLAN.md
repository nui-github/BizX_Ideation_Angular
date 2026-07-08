# Migration Plan — รวมเป็น Angular-at-root ชุดเดียว (แบบ Amethyst_Angular)

> เป้าหมาย: เลิกมี prototype/angular แยกกันสองก้อน → เหลือ **Angular app ชุดเดียวที่ root**
> เพื่อให้ vibe-design กับโค้ดที่ dev เอาไปต่อเป็นก้อนเดียวกัน ไม่ต้อง sync เอง
> โครงสร้างปลายทางเลียนแบบ `Amethyst_Angular` (Angular อยู่ที่ root, `docs/` + `CLAUDE.md`/`ANGULAR.md` ที่ root)

## บริบทการตัดสินใจ
- ปลายทาง deliverable คือ Angular → ก้อนเดียวนั้นต้องเป็น Angular
- ต่อจากนี้ **vibe-design ใน Angular โดยตรง** (ยอมรับว่า iterate ช้ากว่า React+Vite CDN เดิม)
- ต้นทุนก้อนใหญ่ที่สุด = port งาน React ~27,100 บรรทัด / ~20 component ไป Angular (ไม่มีตัวแปลงอัตโนมัติ)

## สถานะโค้ด ณ ตอนวางแผน (2026-07-08)
- `prototype/` (React/Vite): ~27,100 บรรทัด, ~20 component — งานออกแบบทั้งหมดอยู่ที่นี่
  - ตัวใหญ่: DataComparison, DataComparisonWorkflowBuilder, RuleMatrix, LabelSchemaSettings, MasterDataSettings, WorkflowBuilder, DocTypeMaster, AgentForm, ExtractionView
- `angular/`: มี component จริงแค่ 4 ตัว (dashboard + workflow-builder โครง) — แทบว่าง

---

## เฟส 0 — จัดโครงเป็น Angular-at-root (ครึ่งวัน, ไม่แตะดีไซน์) ✅ กำลังทำ
- ย้าย `angular/*` ขึ้น root: `angular.json`, `package.json`, `tsconfig*.json`, `src/`, `public/`, `.editorconfig`
- `angular/README.md` → `ANGULAR.md` ที่ root, เขียน `CLAUDE.md` แนวเดียวกับ Amethyst
- merge `angular/.gitignore` เข้า root `.gitignore`
- **Vercel**: วาง `vercel.json` ที่ root แต่ยังสั่ง build `prototype/` (เดโมลูกค้ายังเป็น React ที่ทำงานได้)
  - Root Directory ใน Vercel ชี้มา repo root ได้ตามต้องการ
  - พอ Angular port เสร็จค่อยสลับ buildCommand เป็น Angular
- `prototype/` ยังคงอยู่ที่เดิม ใช้เป็นต้นฉบับอ้างอิงตอน port (จะลบในเฟส 3)
- ผล: โครงหน้าตาเหมือน Amethyst 100% แต่เนื้อ Angular ยังไม่ครบ

## เฟส 1 — foundation ใน Angular (1–2 วัน)
- Theme/brand color (`#1f5df9`), ng-zorro config, layout shell (sidebar + header)
- routing ตาม `prototype/App.tsx`
- port `mock-data/` + `types.ts` ก่อน (ย้ายง่าย เกือบ copy)

## เฟส 2 — port ทีละ feature (ก้อนใหญ่ ทยอยทำ)
เรียงง่าย→ยาก, แต่ละตัวเสร็จ → verify ใน preview → commit:
1. Tooltip
2. AgentList / RuleList / WorkflowList
3. JobPresetSettings / DocTypeMaster
4. AgentForm / ManageRule
5. UploadPage / TrackingPage / ExtractionView
6. MasterDataSettings / LabelSchemaSettings
7. WorkflowBuilder
8. ComparisonWorkflow / DataComparisonWorkflowBuilder
9. DataComparison / RuleMatrix (ยักษ์สุด ไว้ท้าย)

## เฟส 3 — ปิดงาน
- สลับ Vercel buildCommand → Angular
- ลบ `prototype/` เมื่อ port ครบและ verify แล้ว
- vibe-design ต่อใน Angular ล้วน = ตรงเป้า

---

## หมายเหตุความเสี่ยง
- ระหว่างเฟส 1–2 เดโมลูกค้ายังชี้ที่ React prototype (ไม่พัง)
- อย่าลบ `prototype/` จนกว่าจะ port + verify ครบทุกตัว
