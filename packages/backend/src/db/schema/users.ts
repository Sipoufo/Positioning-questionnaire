// users.ts
// Registered members of the Happy Cash collective. Level mirrors Q2.1 of the
// HC_05 questionnaire (1 = Fondateur, 2 = Membre actif filiale, 3 = Soutien).
// Role separates a regular voter from an administrator (Président, Secrétaire).

import { boolean, pgEnum, pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['member', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  level: smallint('level').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
