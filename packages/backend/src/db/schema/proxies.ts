// proxies.ts
// Schema-only for now (V1.5 feature). A voter (delegator) lets another
// member (delegate) cast on their behalf. Capped at 2 proxies per delegate
// in spec §3.2 — enforced in service code, not schema.

import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { votes } from './votes.js';

export const proxies = pgTable(
  'proxies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voteId: uuid('vote_id')
      .notNull()
      .references(() => votes.id, { onDelete: 'cascade' }),
    delegatorId: uuid('delegator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    delegateId: uuid('delegate_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueDelegator: unique('proxies_vote_delegator_unique').on(t.voteId, t.delegatorId),
    notSelfDelegating: check(
      'proxies_no_self_delegation',
      sql`${t.delegatorId} <> ${t.delegateId}`,
    ),
  }),
);

export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;
