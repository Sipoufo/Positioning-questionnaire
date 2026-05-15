# PROJECT — Happy Cash Positioning Questionnaire

## 1. Mission

Build a public web application that lets each invited member of the **Happy Cash** collective fill out the **Positioning Questionnaire** (HC_05) step by step. On submission, the application generates a branded PDF (Happy Cash charte) and emails it to:

- the administrator (configured via `.env`)
- the respondent (copy of their own submission)

The application does **not** persist responses to a database — every submission is delivered exclusively via email.

## 2. Audience

- **Respondents**: members of the Happy Cash collective invited to fill out the form. Mobile-first usage is expected (most users complete the form from a phone via WhatsApp link).
- **Administrator**: SIPOUFO Yvan (or delegated). Receives every submission as a PDF attachment for offline review and aggregation before the 2nd meeting (23 May 2026).

## 3. Source Content

The questionnaire content is defined in `HC_05_Questionnaire_Positionnement.md`. It contains:

- **11 sections** (identity, engagement level, priority projects, skills, network, finances, name proposals, values, doubts, NDA, closing).
- Mixed question types: short text, phone, email, long text, single-choice, multi-choice, scale 1–5, mandatory consent checkboxes.
- **Conditional logic**:
  - Section 3 (Q3.1–Q3.4) is shown **only if** Q2.1 is Niveau 1 or Niveau 2.
  - Q3.1 is shown **only if** Q2.1 is Niveau 1.
  - Q6.1 is shown **only if** Q2.1 is Niveau 1 or Niveau 2.
  - Q6.2 is required **only if** Q6.1 is ≥ 50 000 FCFA.

The questionnaire schema lives in `packages/shared/src/questionnaire.ts` and is the **single source of truth** consumed by the frontend (rendering + client validation) and the backend (server validation + PDF generation).

## 4. Key Business Rules

1. **Confidentiality** — responses are sensitive (engagement level, financial commitment, personal doubts). They must never appear in logs, error tracking, or anywhere outside the recipient mailbox.
2. **No persistence** — once the email is sent, the server keeps nothing.
3. **Resilient drafts** — the respondent can quit and resume later. Drafts are saved to `localStorage` under `hc:draft` and cleared after successful submission.
4. **Bilingual** — interface FR (default) + EN. Question text is bilingual in the schema.
5. **Public access** — no auth required. The form is accessible to anyone with the URL.
6. **Brand fidelity** — both the web UI and the generated PDF must respect the Happy Cash charte (see `DESIGN_SYSTEM.md`).
7. **Mandatory consent** — Section 10 (Q10.1) checkboxes must all be checked to enable submission.

## 5. Out of Scope (v1)

- Admin dashboard / database / aggregation UI.
- Authentication / unique invite links.
- Anonymous mode.
- Export to CSV / aggregated stats.
- Reminder emails.
- File uploads.

## 6. Stakeholders

- **Product owner**: SIPOUFO Yvan
- **Builder**: Claude Code + developer (collaborative)
- **Recipients of submissions**: administrator email configured in `.env` (e.g. `ADMIN_EMAIL`)

## 7. Timeline

- **20 May 2026, 23:59** — deadline for respondents to submit.
- **23 May 2026** — 2nd Happy Cash meeting where responses are reviewed.

## 8. References

- `HC_05_Questionnaire_Positionnement.md` — source content
- `HC_00_Charte_Graphique_Happy_Cash.pdf` — visual identity reference
- `DESIGN_SYSTEM.md` — tokens and component rules extracted from the charte
- `DEPLOYMENT.md` — VPS deployment guide
