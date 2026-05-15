// api.ts
// Thin fetch wrapper. The base URL is configured via VITE_API_BASE_URL; in dev
// the Vite proxy rewrites `/api/*` to the backend so the contract is the same
// in dev and prod (single-origin under Caddy).

import type { Locale, ResponsePayload } from '@hc/shared';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface SubmitResult {
  ok: true;
}

export interface SubmitError {
  ok: false;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Sends the validated response payload to the API. The backend re-validates
 * server-side, generates the PDF, then emails it to the admin + the respondent.
 */
export const submitQuestionnaire = async (
  response: ResponsePayload,
  locale: Locale,
): Promise<SubmitResult | SubmitError> => {
  try {
    const res = await fetch(`${BASE}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response,
        locale,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    return {
      ok: false,
      status: res.status,
      message: body.message ?? 'submit_failed',
      fieldErrors: body.fieldErrors,
    };
  } catch {
    return { ok: false, status: 0, message: 'submit_failed' };
  }
};
