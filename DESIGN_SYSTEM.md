# DESIGN_SYSTEM — Happy Cash Positioning Questionnaire

> All tokens and component rules below are extracted from `HC_00_Charte_Graphique_Happy_Cash.pdf` (v1.0 — May 2026).
> Any deviation must be approved by the President or the Board.

---

## 1. Color Tokens

The palette is **strictly monochromatic green** with neutral grays and two functional colors (red only for alerts).

### Primary — Green family

| Token | HEX | RGB | Usage |
|---|---|---|---|
| `--hc-green-founder` | `#1B5E20` | 27, 94, 32 | Dominant — covers, headers, footers |
| `--hc-green-pillar` | `#2E7D32` | 46, 125, 50 | Section banners |
| `--hc-green-accent` | `#4CAF50` | 76, 175, 80 | Highlights, left-borders, primary CTA |
| `--hc-green-accent-2` | `#43A047` | 67, 160, 71 | Separators |
| `--hc-green-soft` | `#81C784` | 129, 199, 132 | Faded labels, subtitles on dark bg |
| `--hc-green-pale` | `#A5D6A7` | 165, 214, 167 | Text on dark bg only (≥ 18pt bold) |

### Backgrounds & neutrals

| Token | HEX | Usage |
|---|---|---|
| `--hc-bg-cream` | `#F1F8E9` | **Main page background** |
| `--hc-bg-mint` | `#E8F5E9` | Cards, info boxes, table rows alt |
| `--hc-white` | `#FFFFFF` | Cards, inverted text |
| `--hc-gray-light` | `#ECEFF1` | Soft borders, very light fills |
| `--hc-gray-mid` | `#B0BEC5` | Borders |
| `--hc-gray-slate` | `#546E7A` | Captions, helper text |
| `--hc-gray-text` | `#37474F` | **Body text** — never pure black |

### Functional

| Token | HEX | Usage |
|---|---|---|
| `--hc-red-alert` | `#C62828` | Errors, validation warnings — **alerts only** |
| `--hc-red-pale` | `#FFEBEE` | Alert backgrounds |

### 60 / 30 / 10 rule

- **60%** `--hc-green-founder` (dominant — backgrounds, headers)
- **30%** `--hc-green-accent` (supporting — borders, accents)
- **10%** `--hc-gray-light` (final accent — separators)

### Forbidden combinations (will fail review)

- `#FFFFFF` + `#A5D6A7` — insufficient contrast
- `#1B5E20` + `#2E7D32` — near-zero contrast
- `#F1F8E9` + `#ECEFF1` — invisible
- `#C62828` outside alert/error context
- `#000000` for body text — use `#37474F`
- Any color outside this palette (no yellow, orange, off-palette green, etc.)

---

## 2. Typography

Web stack: **Helvetica, Arial, system-ui** (sans-serif). Calibri is a PowerPoint-only spec — we substitute with Helvetica for web.

| Role | Family | Size | Weight | Color | CSS class |
|---|---|---|---|---|---|
| Cover title | Helvetica | 40–52pt | Bold | `--hc-white` | `text-hc-cover` |
| H1 — section banner | Helvetica | 26–28pt | Bold | `--hc-white` on dark | `text-hc-h1` |
| H2 — page title | Helvetica | 22–26pt | Bold | `--hc-green-founder` | `text-hc-h2` |
| H3 — accroche | Helvetica | 12–14pt | Italic | `--hc-green-soft` | `text-hc-h3` |
| H4 — component | Helvetica | 11–12pt | Bold | `--hc-green-pillar` | `text-hc-h4` |
| Body | Helvetica | 9.5–11pt (web: 16px) | Regular | `--hc-gray-text` | `text-hc-body` |
| Caption | Helvetica | 8–9pt (web: 12px) | Italic | `--hc-gray-slate` | `text-hc-caption` |
| Code / hex | Courier | 8–9pt | — | `--hc-green-pillar` | `text-hc-code` |
| Badge / pill | Helvetica | 8–10pt | Bold | `--hc-white` on green | `badge` component |

**Line-height**: always 1.3 – 1.5 × font-size for body text. Never 1.0.

---

## 3. Spacing & Layout

| Element | Value |
|---|---|
| Page margins (PDF, A4) | 2 cm all sides |
| Section spacing | 12–16 pt (~ 1rem) |
| Paragraph spacing | 4–6 pt after each (~ 0.375rem) |
| Card padding | 8–14 pt (~ 0.75rem) |
| Section banner height | ≥ 22 pt (7 pt top + 7 pt bottom + text) |
| Accent left border | 4 pt (~ 4px web) |
| Separator | 0.5–1 pt in `--hc-green-accent` or `--hc-gray-light` |

---

## 4. Recurring Components (web + PDF)

### Section banner
- **Full width**, bg `--hc-green-pillar`, text white 13–14pt bold.
- Used to introduce each questionnaire section.

### Sub-banner
- Bg `--hc-bg-mint`, **4 pt left border** `--hc-green-accent`, text `--hc-green-founder` 11pt bold.

### Info box
- Bg `--hc-bg-mint`, 1 pt border `--hc-green-accent`, **4 pt left border** `--hc-green-pillar`.
- Text: green italic bold 9pt.

### Alert box (validation errors)
- Bg `--hc-red-pale`, 1 pt border `--hc-red-alert`, **4 pt left border** red.
- Text: red italic bold 9pt.

### Accent card
- Bg white, light border `--hc-bg-mint`, subtle shadow (opacity 0.1), **4–6 pt left border** `--hc-green-accent`.
- Title: 11pt bold `--hc-green-pillar`.

### Standard table
- Header bg `--hc-green-founder`, white bold 9pt.
- Alternating rows: `--hc-white` / `--hc-bg-mint`.
- Grid 0.4 pt `--hc-green-accent`, 5 pt padding.

### Badge / pill
- Rounded rectangle, bg `--hc-bg-mint`, 1 pt border `--hc-green-accent`, text 8–9pt bold `--hc-green-pillar`, centered.

### Sandwich structure (entire document / page flow)
1. **Cover** — bg `--hc-green-founder` (dark)
2. **Content** — bg `--hc-bg-cream` (light)
3. **Closing** — bg `--hc-green-founder` (dark)

The web page must mirror this: dark hero on landing, cream questionnaire body, dark footer / success screen.

---

## 5. Accessibility (WCAG 2.1 AA)

All approved color associations meet ≥ 4.5:1 contrast for normal text or ≥ 3:1 for large text.

- `#FFFFFF` on `#1B5E20` — **14.0:1** ✅ AAA
- `#FFFFFF` on `#2E7D32` — **9.5:1** ✅ AAA
- `#37474F` on `#F1F8E9` — **10.2:1** ✅ AAA
- `#37474F` on `#FFFFFF` — **12.5:1** ✅ AAA
- `#1B5E20` on `#E8F5E9` — **7.8:1** ✅ AAA

### Anti-color-blindness
- Never use color **alone** to convey information.
- Always add a symbol (`✓`, `✕`, `■`) or label alongside color.
- The 8% of men with deuteranopia perceive green as gray — the hierarchy must remain readable in grayscale.

---

## 6. Tailwind 4 mapping

Tokens are defined as CSS custom properties in `packages/frontend/src/styles/tokens.css` and exposed via Tailwind 4's `@theme` directive:

```css
@theme {
  --color-hc-green-founder: #1B5E20;
  --color-hc-green-pillar: #2E7D32;
  --color-hc-green-accent: #4CAF50;
  --color-hc-green-soft: #81C784;
  --color-hc-green-pale: #A5D6A7;
  --color-hc-bg-cream: #F1F8E9;
  --color-hc-bg-mint: #E8F5E9;
  --color-hc-gray-text: #37474F;
  --color-hc-gray-slate: #546E7A;
  --color-hc-gray-mid: #B0BEC5;
  --color-hc-gray-light: #ECEFF1;
  --color-hc-red-alert: #C62828;
  --color-hc-red-pale: #FFEBEE;

  --font-sans: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
}
```

Use them as `bg-hc-bg-cream`, `text-hc-gray-text`, `border-hc-green-accent`, etc.

---

## 7. PDF specifics (`@react-pdf/renderer`)

The PDF mirrors the web visuals but uses native PDF primitives:

- A4 portrait, 2 cm margins.
- Cover page: full-bleed `#1B5E20`, title 44pt white bold, subtitle in `#81C784`.
- Content pages: bg `#F1F8E9`, section banners as `View` with `#2E7D32` bg + white bold 14pt text.
- Tables for question/answer pairs: header row `#1B5E20` white, alternating `#FFFFFF` / `#E8F5E9` body rows.
- Closing page: full-bleed `#1B5E20`, thank-you message white centered.
- Footer on every content page: `Happy Cash · Confidentiel · {date}` in `--hc-gray-slate` 8pt.

Fonts: register Helvetica (default in `@react-pdf/renderer`, no external file needed).
