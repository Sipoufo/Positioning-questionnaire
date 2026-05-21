// magicLinkTokens.ts
// One-shot tokens emailed to a user as part of the password-less login flow.
// Only the SHA-256 hash is stored; the raw token travels in the email and is
// discarded server-side immediately after sending.

import { char, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert;
