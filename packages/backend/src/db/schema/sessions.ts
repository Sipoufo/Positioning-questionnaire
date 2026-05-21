// sessions.ts
// Stateful sessions — chosen over JWT for instant revocability. The raw token
// is sent to the client once (in the verify response) and only its hash is
// stored. TTL is enforced by `expires_at`.

import { char, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
