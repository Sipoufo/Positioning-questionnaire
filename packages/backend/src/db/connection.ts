// connection.ts
// Single shared Postgres client + Drizzle wrapper. Module-scope so the
// connection pool is reused across all requests.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema/index.js';

// `max: 10` keeps the pool modest — Happy Cash scale never needs more.
// `prepare: false` is required when behind PgBouncer in transaction mode; harmless otherwise.
const queryClient = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;

/** Closes the pool. Call from a graceful-shutdown handler. */
export const closeDb = async (): Promise<void> => {
  await queryClient.end({ timeout: 5 });
};
