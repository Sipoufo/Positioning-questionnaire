// vote.ts
// Public contracts for the vote module — shared between the frontend (auth
// flow, admin forms, ballot casting) and the backend (Zod validation at the
// API boundary). Never duplicate these types inside either package.

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Domain unions (mirror the Postgres enums declared in `db/schema`)
// ─────────────────────────────────────────────────────────────────────────────

export const USER_ROLES = ['member', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_LEVELS = [1, 2, 3] as const;
export type UserLevel = (typeof USER_LEVELS)[number];

export const VOTE_MODES = ['anonymous', 'open'] as const;
export type VoteMode = (typeof VOTE_MODES)[number];

export const SCRUTIN_TYPES = ['single', 'multiple'] as const;
export type ScrutinType = (typeof SCRUTIN_TYPES)[number];

export const MAJORITY_TYPES = [
  'simple',
  'absolute',
  'qualified_2_3',
  'qualified_3_4',
  'unanimous',
] as const;
export type MajorityType = (typeof MAJORITY_TYPES)[number];

export const MAJORITY_BASES = ['expressed', 'expressed_with_blank', 'eligible'] as const;
export type MajorityBase = (typeof MAJORITY_BASES)[number];

export const RESULT_VISIBILITIES = ['immediate', 'on_close', 'admin_only'] as const;
export type ResultVisibility = (typeof RESULT_VISIBILITIES)[number];

export const VOTE_STATUSES = ['draft', 'open', 'closed', 'cancelled'] as const;
export type VoteStatus = (typeof VOTE_STATUSES)[number];

export const CLOSE_MODES = ['auto', 'manual'] as const;
export type CloseMode = (typeof CLOSE_MODES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Public DTOs — what flows over the wire
// ─────────────────────────────────────────────────────────────────────────────

/** Voter information safe to send to the frontend (no internal columns). */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  level: UserLevel;
  role: UserRole;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas — validated at the API boundary on both sides
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL = z.string().trim().toLowerCase().email().max(254);
const FULL_NAME = z.string().trim().min(2).max(200);
const LEVEL = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Body of POST /api/auth/request — start the magic-link flow. */
export const magicLinkRequestSchema = z.object({
  email: EMAIL,
});
export type MagicLinkRequestPayload = z.infer<typeof magicLinkRequestSchema>;

/** Body of POST /api/auth/verify — exchange a magic link for a session token. */
export const magicLinkVerifySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i, 'invalid_token_format'),
});
export type MagicLinkVerifyPayload = z.infer<typeof magicLinkVerifySchema>;

/** Successful response from POST /api/auth/verify. */
export interface MagicLinkVerifyResult {
  sessionToken: string;
  expiresAt: string;
  user: PublicUser;
}

/** Body of POST /api/admin/voters — admin creates a new voter. */
export const createVoterSchema = z.object({
  email: EMAIL,
  fullName: FULL_NAME,
  level: LEVEL,
  role: z.enum(USER_ROLES).default('member'),
});
export type CreateVoterPayload = z.infer<typeof createVoterSchema>;

/** Body of PATCH /api/admin/voters/:id — every field optional. */
export const updateVoterSchema = z
  .object({
    email: EMAIL.optional(),
    fullName: FULL_NAME.optional(),
    level: LEVEL.optional(),
    role: z.enum(USER_ROLES).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no_fields_provided' });
export type UpdateVoterPayload = z.infer<typeof updateVoterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Vote creation + update
// ─────────────────────────────────────────────────────────────────────────────

const PERCENT = z.number().min(0).max(100);

/** Input for one selectable option at vote-creation time. */
export const voteOptionInputSchema = z.object({
  labelFr: z.string().trim().min(1).max(300),
  labelEn: z.string().trim().min(1).max(300),
});
export type VoteOptionInput = z.infer<typeof voteOptionInputSchema>;

/** Body of POST /api/admin/votes — creates a vote in `draft` status. */
export const createVoteSchema = z
  .object({
    title: z.string().trim().min(3).max(300),
    description: z.string().trim().max(5000).optional(),
    mode: z.enum(VOTE_MODES),
    scrutinType: z.enum(SCRUTIN_TYPES),
    maxChoices: z.number().int().min(1).max(20).default(1),
    allowBlank: z.boolean().default(false),
    eligibleLevels: z.array(LEVEL).min(1).max(3),
    quorumPct: PERCENT.default(0),
    majorityType: z.enum(MAJORITY_TYPES),
    majorityBase: z.enum(MAJORITY_BASES).default('expressed'),
    resultVisibility: z.enum(RESULT_VISIBILITIES),
    openAt: z.string().datetime().optional(),
    closeAt: z.string().datetime().optional(),
    closeMode: z.enum(CLOSE_MODES).default('manual'),
    multiRound: z.boolean().default(false),
    topNForRound2: z.number().int().min(2).max(10).default(2),
    options: z.array(voteOptionInputSchema).min(2).max(50),
  })
  .superRefine((v, ctx) => {
    if (v.scrutinType === 'single' && v.maxChoices !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxChoices'],
        message: 'single_must_have_max_choices_one',
      });
    }
    if (v.scrutinType === 'multiple' && v.maxChoices < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxChoices'],
        message: 'multiple_must_have_max_choices_ge_two',
      });
    }
    if (v.maxChoices > v.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxChoices'],
        message: 'max_choices_exceeds_options',
      });
    }
    if (v.closeMode === 'auto' && !v.closeAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closeAt'],
        message: 'auto_close_requires_close_at',
      });
    }
    if (v.openAt && v.closeAt && new Date(v.openAt) >= new Date(v.closeAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closeAt'],
        message: 'close_at_must_be_after_open_at',
      });
    }
  });
export type CreateVotePayload = z.infer<typeof createVoteSchema>;

/** Body of POST /api/votes/:id/rounds/:roundId/ballot. */
export const ballotPayloadSchema = z
  .object({
    choices: z.array(z.string().uuid()).max(20),
    isBlank: z.boolean(),
    comment: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.isBlank && v.choices.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'blank_must_have_no_choices',
      });
    }
    if (!v.isBlank && v.choices.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'at_least_one_choice_required',
      });
    }
  });
export type BallotPayload = z.infer<typeof ballotPayloadSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Public DTOs returned by the vote endpoints
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicVoteOption {
  id: string;
  labelFr: string;
  labelEn: string;
  displayOrder: number;
}

export interface PublicVoteRound {
  id: string;
  roundNumber: number;
  status: 'open' | 'closed';
  openAt: string;
  closeAt: string | null;
  closedAt: string | null;
  options: PublicVoteOption[];
}

/** Lightweight shape used by listings. */
export interface VoteSummary {
  id: string;
  title: string;
  mode: VoteMode;
  status: VoteStatus;
  closeAt: string | null;
  currentRoundNumber: number;
  hasVoted: boolean;
}

/** Full vote with the *current* round and its options. */
export interface VoteDetail {
  id: string;
  title: string;
  description: string | null;
  mode: VoteMode;
  scrutinType: ScrutinType;
  maxChoices: number;
  allowBlank: boolean;
  eligibleLevels: UserLevel[];
  quorumPct: number;
  majorityType: MajorityType;
  majorityBase: MajorityBase;
  resultVisibility: ResultVisibility;
  openAt: string | null;
  closeAt: string | null;
  closeMode: CloseMode;
  status: VoteStatus;
  multiRound: boolean;
  topNForRound2: number;
  currentRound: PublicVoteRound;
  hasVoted: boolean;
}

export interface OptionTally {
  optionId: string;
  count: number;
}

/** Computed at round close, persisted into `vote_rounds.result`. */
export interface RoundResult {
  tallies: OptionTally[];
  blankCount: number;
  totalBallots: number;
  totalEligible: number;
  participationPct: number;
  quorumMet: boolean;
  majorityMet: boolean;
  winners: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic API result helpers used by the frontend fetch wrappers
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ApiResult<T> = ApiOk<T> | ApiError;
