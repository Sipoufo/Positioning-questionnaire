// auditLog.ts
// Append-only trail of every meaningful action on the vote system. Required
// by §3.5 of the spec (10-year retention). Never contains individual ballot
// content — only metadata.

import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEntity: index('audit_log_entity_idx').on(t.entityType, t.entityId),
    byCreatedAt: index('audit_log_created_at_idx').on(t.createdAt),
  }),
);

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
