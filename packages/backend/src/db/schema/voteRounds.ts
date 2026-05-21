// voteRounds.ts
// A vote can have several rounds (typically 1 or 2). Round 2 is auto-created
// when round 1 closes without majority and `multiRound = true` on the vote.

import {
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { votes } from './votes.js';

export const roundStatusEnum = pgEnum('round_status', ['open', 'closed']);

export const voteRounds = pgTable(
  'vote_rounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voteId: uuid('vote_id')
      .notNull()
      .references(() => votes.id, { onDelete: 'cascade' }),
    roundNumber: smallint('round_number').notNull().default(1),
    status: roundStatusEnum('status').notNull().default('open'),
    openAt: timestamp('open_at', { withTimezone: true }).notNull().defaultNow(),
    closeAt: timestamp('close_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    // Tally + verdict written at close. Shape:
    // { tallies: [{optionId, count}], blankCount, totalBallots, quorumMet, majorityMet, winners: [optionId] }
    result: jsonb('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueRound: unique('vote_rounds_vote_id_round_number_unique').on(t.voteId, t.roundNumber),
  }),
);

export type VoteRound = typeof voteRounds.$inferSelect;
export type NewVoteRound = typeof voteRounds.$inferInsert;
