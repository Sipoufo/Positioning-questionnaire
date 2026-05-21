// ballots.ts
// Records WHAT was voted with no FK to any user. In anonymous mode `userId`
// is NULL and `ballotToken` carries the per-ballot random identifier. In open
// mode `userId` is set and `ballotToken` is NULL. A CHECK constraint (added
// by a custom migration step) enforces this exclusivity.

import {
  boolean,
  char,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { voteRounds } from './voteRounds.js';

export const ballots = pgTable('ballots', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .notNull()
    .references(() => voteRounds.id, { onDelete: 'cascade' }),
  // Anonymous mode only: 64-hex random token. After vote close it may be
  // replaced by a short sequential identifier so receipts can still be
  // verified without retaining identifying entropy.
  ballotToken: char('ballot_token', { length: 64 }).unique(),
  // Open mode only: direct link to the voter.
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Array of vote_option ids. Empty array = blank ballot.
  choices: uuid('choices').array().notNull(),
  isBlank: boolean('is_blank').notNull().default(false),
  comment: text('comment'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Ballot = typeof ballots.$inferSelect;
export type NewBallot = typeof ballots.$inferInsert;
