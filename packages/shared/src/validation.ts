// validation.ts
// Server- and client-side validation derived from the questionnaire schema.
// Returns a flat record of error messages keyed by question id (and optionally
// `<id>:precise` for the companion free-text field).

import { z } from 'zod';
import {
  ALL_QUESTIONS,
  getVisibleQuestions,
  getVisibleSections,
  isQuestionRequired,
} from './questionnaire.js';
import type { Answer, PartialResponse, Question, ResponsePayload, Section } from './types.js';

const EMAIL = z.string().email();
const PHONE = z.string().regex(/^[+0-9\s().-]{6,30}$/, 'invalid_phone');

/** Returns an error key for the given question, or null if the answer passes. */
const validateQuestion = (
  question: Question,
  answer: Answer | undefined,
  response: PartialResponse,
): string | null => {
  const required = isQuestionRequired(question, response);
  const isEmpty =
    answer === undefined ||
    answer === '' ||
    (Array.isArray(answer) && answer.length === 0);

  if (isEmpty) {
    return required ? 'required' : null;
  }

  switch (question.type) {
    case 'email': {
      if (typeof answer !== 'string') return 'invalid';
      return EMAIL.safeParse(answer).success ? null : 'invalid_email';
    }
    case 'tel': {
      if (typeof answer !== 'string') return 'invalid';
      return PHONE.safeParse(answer).success ? null : 'invalid_phone';
    }
    case 'text':
    case 'textarea': {
      if (typeof answer !== 'string') return 'invalid';
      if (question.maxLength && answer.length > question.maxLength) return 'too_long';
      return null;
    }
    case 'radio':
    case 'scale': {
      if (typeof answer !== 'string') return 'invalid';
      const ok = question.options.some((o) => o.value === answer);
      return ok ? null : 'invalid_option';
    }
    case 'checkbox': {
      if (!Array.isArray(answer)) return 'invalid';
      const known = new Set(question.options.map((o) => o.value));
      if (!answer.every((v) => known.has(v))) return 'invalid_option';
      if (question.maxSelected && answer.length > question.maxSelected) return 'too_many';
      return null;
    }
    case 'consent': {
      if (!Array.isArray(answer)) return 'invalid';
      // Every consent option must be checked.
      return answer.length === question.options.length ? null : 'all_required';
    }
  }
};

/** Validates a single section, returning a map of `{ questionId: errorKey }`. */
export const validateSection = (
  section: Section,
  response: PartialResponse,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const question of getVisibleQuestions(section, response)) {
    const err = validateQuestion(question, response[question.id], response);
    if (err) errors[question.id] = err;
  }
  return errors;
};

/** Validates the complete response — used by the API before sending the email. */
export const validateFullResponse = (
  response: PartialResponse,
): { ok: true; data: ResponsePayload } | { ok: false; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  for (const section of getVisibleSections(response)) {
    Object.assign(errors, validateSection(section, response));
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // Strip unknown keys and answers belonging to hidden questions.
  const visibleIds = new Set<string>();
  for (const section of getVisibleSections(response)) {
    for (const q of getVisibleQuestions(section, response)) {
      visibleIds.add(q.id);
    }
  }

  const cleaned: ResponsePayload = {};
  for (const [key, value] of Object.entries(response)) {
    // Keep `<id>:precise` companion fields if the parent question is visible.
    const parentId = key.endsWith(':precise') ? key.slice(0, -':precise'.length) : key;
    if (visibleIds.has(parentId) && value !== undefined) {
      cleaned[key] = value;
    }
  }

  return { ok: true, data: cleaned };
};

/** Zod schema for the raw submission payload received by the API. */
export const submissionSchema = z.object({
  response: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  locale: z.union([z.literal('fr'), z.literal('en')]),
  submittedAt: z.string().datetime(),
});

/** Re-export to satisfy "unused import" linters in consumers. */
export type { Answer, Question };
export { ALL_QUESTIONS };
