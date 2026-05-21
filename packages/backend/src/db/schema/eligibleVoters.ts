// eligibleVoters.ts
// Frozen snapshot of who may vote, captured at the moment a vote moves to
// `open`. A later change to a user's level does not affect votes already open.

import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { votes } from './votes.js';

export const eligibleVoters = pgTable(
  'eligible_voters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voteId: uuid('vote_id')
      .notNull()
      .references(() => votes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueEligible: unique('eligible_voters_vote_user_unique').on(t.voteId, t.userId),
  }),
);

export type EligibleVoter = typeof eligibleVoters.$inferSelect;
export type NewEligibleVoter = typeof eligibleVoters.$inferInsert;
