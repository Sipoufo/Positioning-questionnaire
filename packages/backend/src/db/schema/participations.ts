// participations.ts
// Records WHO has voted, never WHAT they voted. Paired with `ballots` which
// records WHAT was voted without any FK back here. This is the cryptographic
// dissociation seam — there is intentionally no column joining the two.

import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { voteRounds } from './voteRounds.js';

export const participations = pgTable(
  'participations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => voteRounds.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Coarse minute-level precision rounds out sub-second timing that would
    // otherwise let an attacker correlate a participation row with a ballot
    // row in the same backup.
    votedAt: timestamp('voted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueParticipation: unique('participations_round_user_unique').on(t.roundId, t.userId),
  }),
);

export type Participation = typeof participations.$inferSelect;
export type NewParticipation = typeof participations.$inferInsert;
