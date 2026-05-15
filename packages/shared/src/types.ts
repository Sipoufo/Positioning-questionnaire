// types.ts
// Type definitions consumed by both the frontend (rendering + state) and the backend
// (validation + PDF generation). The questionnaire schema in `questionnaire.ts` is
// typed against the contracts declared here.

export type Locale = 'fr' | 'en';

/**
 * Bilingual string. Question labels, option labels and helper text are stored as
 * `{ fr, en }` so that the schema is self-contained and the UI never has to
 * cross-reference an external locale file for content tightly coupled to the schema.
 */
export interface I18nText {
  fr: string;
  en: string;
}

/** Supported question control types. */
export type QuestionType =
  | 'text'
  | 'tel'
  | 'email'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'scale'
  | 'consent';

/** A selectable option for radio / checkbox / scale questions. */
export interface QuestionOption {
  /** Stable value persisted in the response payload. */
  value: string;
  label: I18nText;
  /**
   * If true, picking this option also enables a free-text "precise" field
   * (e.g. "Autre (précise)"). The free text is stored under the question id
   * with the suffix `:precise`.
   */
  withPrecision?: boolean;
}

/**
 * Conditional visibility rule. The question is rendered/validated only when
 * the response payload satisfies this predicate.
 */
export type VisibilityRule = (response: PartialResponse) => boolean;

export interface BaseQuestion {
  /** Stable identifier — also used as the key in the response payload (e.g. "q2.1"). */
  id: string;
  /** Section number this question belongs to (1..11). */
  section: number;
  type: QuestionType;
  label: I18nText;
  helper?: I18nText;
  required: boolean;
  /** When present, the question is only shown if this returns true. */
  visibleWhen?: VisibilityRule;
  /** When present, marks the question as required only if this returns true. */
  requiredWhen?: VisibilityRule;
  /** Max length for text inputs. */
  maxLength?: number;
  /** Placeholder for text inputs. */
  placeholder?: I18nText;
}

export interface TextQuestion extends BaseQuestion {
  type: 'text' | 'tel' | 'email' | 'textarea';
}

export interface RadioQuestion extends BaseQuestion {
  type: 'radio';
  options: QuestionOption[];
}

export interface CheckboxQuestion extends BaseQuestion {
  type: 'checkbox';
  options: QuestionOption[];
  /** Optional cap on the number of options the user may pick. */
  maxSelected?: number;
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale';
  /** 1..N scale; labels per step. */
  options: QuestionOption[];
}

export interface ConsentQuestion extends BaseQuestion {
  type: 'consent';
  /** Each entry is one mandatory consent checkbox. All must be checked. */
  options: QuestionOption[];
}

export type Question =
  | TextQuestion
  | RadioQuestion
  | CheckboxQuestion
  | ScaleQuestion
  | ConsentQuestion;

export interface Section {
  /** 1..11 — mirrors the source markdown. */
  number: number;
  title: I18nText;
  intro?: I18nText;
  questions: Question[];
  /** When present, the whole section is skipped if this returns false. */
  visibleWhen?: VisibilityRule;
}

/**
 * Shape of a single answer.
 * - text answers → string
 * - radio       → string (the chosen option value), plus optional `:precise` field
 * - checkbox    → string[] (the chosen option values), plus optional `:precise` field
 * - scale       → string (the chosen step value)
 * - consent     → string[] (the values of every checked box — must equal options length)
 */
export type Answer = string | string[];

/** Full response payload — keys are question ids (e.g. "q2.1"). */
export type ResponsePayload = Record<string, Answer>;

/** Partial response used during the step-by-step flow and conditional checks. */
export type PartialResponse = Partial<ResponsePayload>;

/** What the API receives. */
export interface SubmissionPayload {
  response: ResponsePayload;
  locale: Locale;
  /** ISO timestamp captured client-side at submit time. */
  submittedAt: string;
}
