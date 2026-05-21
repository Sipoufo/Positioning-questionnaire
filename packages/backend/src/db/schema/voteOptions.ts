// voteOptions.ts
// One row per selectable option, per round. Round 2 has its own subset of
// options (the top-N from round 1) — never reuse round-1 rows.

import { pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { voteRounds } from './voteRounds.js';
import { votes } from './votes.js';

export const voteOptions = pgTable('vote_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  voteId: uuid('vote_id')
    .notNull()
    .references(() => votes.id, { onDelete: 'cascade' }),
  roundId: uuid('round_id')
    .notNull()
    .references(() => voteRounds.id, { onDelete: 'cascade' }),
  labelFr: varchar('label_fr', { length: 300 }).notNull(),
  labelEn: varchar('label_en', { length: 300 }).notNull(),
  displayOrder: smallint('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VoteOption = typeof voteOptions.$inferSelect;
export type NewVoteOption = typeof voteOptions.$inferInsert;
