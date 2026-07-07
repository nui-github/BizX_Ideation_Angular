# Design System

This design system defines the visual language, ensuring a polished, consistent, and predictable interface on top of `ng-zorro-antd`.

## 1. UI Framework Integration
- **Foundation:** Use `ng-zorro-antd` components for standard interactions (`<button nz-button>`, `<nz-table>`, `<nz-modal>`).
- **Layout:** Rely on `<nz-layout>`, `<nz-row>`, `<nz-col>`, `<nz-space>`, and `<nz-card>` for structural grids.
- **Theming:** Use component-scoped SCSS (`.scss`) to override default Ant Design styles to match these specific brand aesthetics (e.g. custom paddings, border radii, brand colors) without breaking global styles.

## 2. Typography
- **Font Family:** `IBM Plex Sans Thai`
- **Application:** Used universally. Conveys technical precision while remaining highly legible for long data-review sessions.
- **Hierarchy:** Ensure strict contrast between primary values (black/bold weight, dark text), secondary labels (bold weight, muted slate), and micro-copy (small size, tracking widest uppercase).

## 3. Color Palette
- **Primary Brand:** `#1F5DF9` (Deep Blue)
  - Used for: Primary interactions, active states, loading indicators, and AI analysis blocks.
- **Accent Brand:** `#16EA9E` (Mint Green)
  - Used for: Special highlights or distinctive actions.
- **Base Text:** `#010136` (Very Dark Navy)
  - Used for: Main readable content and emphasized headings.

### Status Semantic Colors
- **Success / Matched / Locked:** Emerald (`#10b981` / background `tint`)
- **Warning / Extracting / Partial:** Amber (`#f59e0b` / background `tint`)
- **Error / Mismatched:** Rose (`#f43f5e` / background `tint`)

### Mismatch Highlighting (Inline Diff)
- To enable precise manual review, mismatched values should not merely highlight the entire text block. Instead, implement **Inline Diff Highlighting**:
  - Analyze differences at character/word level (e.g. via `diffChars`).
  - Highlight only the actual differing/removed parts using a clear red/pink background (`bg-rose-200 text-rose-800` or equivalent) within the main value.
  - The standard/original reference label underneath should hide the deleted parts and only display added or matching parts without distracting line-through elements, presenting a clean point-of-difference visual cue.

## 4. Structural Geometry (Border Radius Rules)
To maintain structural consistency, custom border radii should be tightly controlled via SCSS overrides:
- **4px:** All buttons (including `<button>`, `nz-button`), inputs, text fields, text areas, dropdowns, selects, and box uploads MUST strictly use a border-radius of 4px (`rounded-[4px]`).
- **8px:** Container subgroups (`Sub-sections`, `Data Cards`, list items).
- **16px:** Major structural regions (`Main Sections`, application containers, wide layout wrappers).

## 5. Iconography
- **Library:** `Lucide Icons` (e.g. `lucide-angular`).
- **Usage:** Maintain unified stroke widths. Use `size="16"` for inline text icons, `size="20"` for standard buttons, and thin strokes (`strokeWidth="1.5"` or `2`) to match the minimal aesthetic.
