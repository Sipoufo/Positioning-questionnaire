# Happy Cash — Positioning Questionnaire

Step-by-step web questionnaire for the Happy Cash collective. On submission, generates a branded PDF and emails it to the administrator + the respondent.

> **Documentation map**
> - [`CLAUDE.md`](./CLAUDE.md) — engineering rules and stack
> - [`PROJECT.md`](./PROJECT.md) — context, audience, business rules
> - [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — tokens and components (charte Happy Cash)
> - [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Hostinger VPS deployment guide
> - [`HC_05_Questionnaire_Positionnement.md`](./HC_05_Questionnaire_Positionnement.md) — source content
> - [`HC_00_Charte_Graphique_Happy_Cash.pdf`](./HC_00_Charte_Graphique_Happy_Cash.pdf) — visual identity reference

## Stack

- **Frontend** — React 19, Vite 6, TypeScript strict, Tailwind 4, react-hook-form + Zod, i18next (FR / EN), framer-motion
- **Backend** — Node 20, Express 5, TypeScript strict, Zod, `@react-pdf/renderer`, Nodemailer
- **Shared** — typed questionnaire schema (`@hc/shared`) consumed by both
- **Infra** — pnpm workspaces, Docker Compose, Caddy (auto HTTPS)

## Local development

```bash
pnpm install
cp .env.example .env  # fill SMTP + admin email
pnpm dev              # frontend on :5173, backend on :3001
```

Open <http://localhost:5173>.

## Build & run with Docker

```bash
docker compose up --build
```

Behind Caddy on `DOMAIN`. See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full VPS guide.

## Project layout

```
positioning-questionnaire/
├── packages/
│   ├── shared/        # @hc/shared — questionnaire schema + Zod validation
│   ├── frontend/      # @hc/frontend — React SPA
│   └── backend/       # @hc/backend — Express API + PDF + email
├── infra/             # Nginx + Caddyfile
├── docker-compose.yml
└── .env.example
```

## Key features

- 11 sections, conditional logic (Section 3 only for Levels 1/2, Q6.2 only if Q6.1 ≥ 50k FCFA)
- Bilingual UI (FR default, EN)
- Draft auto-saved to `localStorage` — refresh-resilient
- Server-side PDF generation respecting the Happy Cash charte ("sandwich" layout)
- No database — submissions live in the recipient mailboxes only

## License

Internal — Happy Cash collective. Confidential.
