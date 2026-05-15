# Project: Happy Cash — Positioning Questionnaire

> React 19 SPA + Node/Express API — step-by-step questionnaire that emails a branded PDF on submission.
> See @PROJECT.md for full project context and business rules.
> See @DESIGN_SYSTEM.md for UI/UX tokens derived from the Happy Cash brand guidelines.

---

# Tech Stack

## Frontend (`packages/frontend`)
- Framework: **React 19** (function components + hooks)
- Build tool: **Vite 6**
- Language: **TypeScript** (strict)
- Styling: **Tailwind CSS 4** (CSS-first config via `@theme`)
- Forms & validation: **react-hook-form + Zod**
- i18n: **i18next + react-i18next** (FR default, EN)
- Routing: **react-router-dom**
- Icons: **lucide-react**
- Animations: **framer-motion** (step transitions)
- HTTP: **fetch** wrapped in a tiny `services/api.ts`

## Backend (`packages/backend`)
- Runtime: **Node 20**
- Framework: **Express 5**
- Language: **TypeScript** (strict)
- Validation: **Zod**
- PDF: **@react-pdf/renderer** (server-side, charte Happy Cash)
- Email: **Nodemailer** (SMTP — Gmail / Brevo / OVH / Resend SMTP / etc.)

## Shared (`packages/shared`)
- Single source of truth for the questionnaire schema + types + Zod validators.
- Imported by both `frontend` and `backend` via pnpm workspace (`workspace:*`).

## Infra
- **pnpm workspaces** (monorepo)
- **Docker Compose** (services: `web` Nginx-static, `api` Node, `caddy` reverse proxy)
- **Caddy** for automatic HTTPS via Let's Encrypt
- Target host: **Hostinger VPS, Ubuntu 24.04**

---

# Project Structure

```
positioning-questionnaire/
├── packages/
│   ├── shared/                    # @hc/shared
│   │   └── src/
│   │       ├── questionnaire.ts   # 11 sections, types, conditional logic
│   │       ├── types.ts
│   │       └── index.ts
│   ├── frontend/                  # @hc/frontend (React + Vite)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/            # Button, Input, Radio, Checkbox, ProgressBar, Card
│   │       │   └── form/          # QuestionRenderer, StepNavigation, StepIndicator
│   │       ├── features/questionnaire/
│   │       │   ├── useFormState.ts   # state + localStorage persistence
│   │       │   ├── validation.ts     # step-level Zod composition
│   │       │   └── steps.ts          # step order + conditional skip logic
│   │       ├── pages/             # Landing, Questionnaire, Success
│   │       ├── i18n/              # i18next setup + locales (fr.json, en.json)
│   │       ├── services/api.ts
│   │       ├── styles/tokens.css  # Happy Cash design tokens
│   │       ├── styles/globals.css
│   │       └── main.tsx
│   └── backend/                   # @hc/backend (Express + TS)
│       └── src/
│           ├── routes/submit.ts
│           ├── services/
│           │   ├── pdf.tsx        # @react-pdf/renderer
│           │   └── email.ts       # Nodemailer
│           ├── validation/response.ts
│           └── index.ts
├── infra/
│   ├── Caddyfile
│   └── nginx.conf                 # static SPA serving for the web container
├── docker-compose.yml
├── .env.example
├── DEPLOYMENT.md                  # Hostinger VPS step-by-step
├── PROJECT.md
├── DESIGN_SYSTEM.md
├── CLAUDE.md
└── HC_05_Questionnaire_Positionnement.md   # source content (do not modify)
```

---

# Conventions

- Components: `PascalCase` (e.g. `QuestionRenderer.tsx`)
- Hooks: `camelCase` prefixed with `use` (e.g. `useFormState.ts`)
- Services / utils: `camelCase`
- Types/Interfaces: `PascalCase` with purpose suffix (e.g. `QuestionnaireResponse`, `QuestionConfig`)
- Files & folders: `kebab-case` for folders, `PascalCase.tsx` for components, `camelCase.ts` for non-component modules
- Constants: `SCREAMING_SNAKE_CASE`
- Always function components with hooks — **no class components**
- Never use `any` — type explicitly or use `unknown` + narrowing
- All code comments in **English**
- JSDoc for exported functions, services, and complex hooks:

```ts
/**
 * Submits the completed questionnaire to the API.
 * @param response - The validated questionnaire response payload
 * @returns Promise resolving when the email has been queued
 */
export const submitQuestionnaire = (response: QuestionnaireResponse): Promise<void> => ...
```

- Top-level comment on each component file describing its purpose:

```tsx
// QuestionRenderer.tsx
// Dispatches a question config to the matching UI control (text / radio / checkbox / scale).
```

---

# i18n Rules

- **All user-facing UI chrome** (buttons, navigation, errors, page titles) must use `t()` from `useTranslation()`.
- **Question labels and option text** live inline in the questionnaire schema as `{ fr, en }` objects — this keeps the schema self-contained and the source of truth in one file.
- Supported languages: `fr` (default), `en`
- UI locale files: `packages/frontend/src/i18n/locales/fr.json` and `en.json`
- When adding a UI key, always add it to **both** locale files in the same commit.
- Language toggle exposed in the header; persisted in `localStorage` (`hc:lang`).

---

# Commands

Run from repo root.

## Development
- Install: `pnpm install`
- Dev (both apps in parallel): `pnpm dev`
- Frontend only: `pnpm --filter @hc/frontend dev`
- Backend only: `pnpm --filter @hc/backend dev`

## Build
- `pnpm build` (builds all packages)

## Code Quality
- `pnpm lint`
- `pnpm type-check`
- `pnpm format`

## Docker / Deploy
- Local up: `docker compose up --build`
- See `DEPLOYMENT.md` for VPS deployment.

---

# Project Rules

## 1. Plan Before Coding
- Before any non-trivial change, write a short plan (steps, files, risks) and wait for explicit validation.

## 2. Shared schema is the source of truth
- Every question, option, conditional rule lives in `packages/shared/src/questionnaire.ts`.
- Frontend (rendering + validation), backend (validation + PDF) consume it. **Never duplicate.**

## 3. Brand fidelity
- Every visual element (web UI and PDF) must use only the tokens defined in `DESIGN_SYSTEM.md`.
- The forbidden associations listed in the charte (white-on-pale-green, red outside alerts, pure black text, etc.) must be rejected in code review.

## 4. Always Test Before Shipping
- Run `pnpm lint && pnpm type-check` before any commit.
- Manually walk the full questionnaire flow in FR and EN at least once before declaring a feature done.

## 5. Autonomous Bug Fixing
- Analyze root cause before fixing.
- After fixing, validate with lint + type-check.

---

# Prohibitions

- NEVER hardcode UI chrome strings — always use i18next.
- NEVER inline styles — Tailwind utility classes only (with tokens defined in `tokens.css`).
- NEVER call `fetch` directly in a component — always go through `services/api.ts`.
- NEVER use `any` in TypeScript.
- NEVER use class components.
- NEVER duplicate the questionnaire schema in `frontend` or `backend` — always import from `@hc/shared`.
- NEVER commit with TypeScript errors or ESLint violations.
- NEVER expose SMTP credentials to the frontend — secrets stay in the backend `.env`.
- NEVER introduce a color outside the Happy Cash palette (see DESIGN_SYSTEM.md).
- NEVER use pure black (`#000000`) for text — use `#37474F` (Gris Texte).
- NEVER use red outside the alert/error context.
- NEVER write comments in French — English only.
- NEVER write obvious comments that restate the code.
