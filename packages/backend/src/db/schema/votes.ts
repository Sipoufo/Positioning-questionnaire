// votes.ts
// A single vote. `anonymousKey` holds the AES-GCM-encrypted per-vote secret
// used only during the vote window; it is nulled at the vote close to make
// the dissociation permanent. `eligibleLevels` is the snapshot of which
// member levels (1/2/3) can vote — applied at open time.

import { getTableColumns } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const voteModeEnum = pgEnum('vote_mode', ['anonymous', 'open']);
export const scrutinTypeEnum = pgEnum('scrutin_type', ['single', 'multiple']);
export const majorityTypeEnum = pgEnum('majority_type', [
  'simple',
  'absolute',
  'qualified_2_3',
  'qualified_3_4',
  'unanimous',
]);
export const majorityBaseEnum = pgEnum('majority_base', [
  'expressed',
  'expressed_with_blank',
  'eligible',
]);
export const resultVisibilityEnum = pgEnum('result_visibility', [
  'immediate',
  'on_close',
  'admin_only',
]);
export const voteStatusEnum = pgEnum('vote_status', ['draft', 'open', 'closed', 'cancelled']);
export const closeModeEnum = pgEnum('close_mode', ['auto', 'manual']);

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  mode: voteModeEnum('mode').notNull(),
  scrutinType: scrutinTypeEnum('scrutin_type').notNull(),
  maxChoices: smallint('max_choices').notNull().default(1),
  allowBlank: boolean('allow_blank').notNull().default(false),
  // Postgres smallint[] of eligible levels (e.g. {1} or {1,2,3}).
  eligibleLevels: smallint('eligible_levels').array().notNull(),
  quorumPct: numeric('quorum_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  majorityType: majorityTypeEnum('majority_type').notNull(),
  majorityBase: majorityBaseEnum('majority_base').notNull().default('expressed'),
  resultVisibility: resultVisibilityEnum('result_visibility').notNull(),
  openAt: timestamp('open_at', { withTimezone: true }),
  closeAt: timestamp('close_at', { withTimezone: true }),
  closeMode: closeModeEnum('close_mode').notNull().default('manual'),
  status: voteStatusEnum('status').notNull().default('draft'),
  multiRound: boolean('multi_round').notNull().default(false),
  topNForRound2: smallint('top_n_for_round2').notNull().default(2),
  // Per-vote secret, AES-256-GCM encrypted with ANONYMITY_MASTER_KEY.
  // JSON shape: { iv: hex, ciphertext: hex, authTag: hex }. Nulled at vote close.
  anonymousKey: jsonb('anonymous_key'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;

// Projection that omits `anonymousKey` so we never serve the encrypted secret
// over the API. Use as `db.select(safeVoteColumns).from(votes)`.
const { anonymousKey: _anonymousKeyOmitted, ...safeVoteColumnsObj } = getTableColumns(votes);
export const safeVoteColumns = safeVoteColumnsObj;
