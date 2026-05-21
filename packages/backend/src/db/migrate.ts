// migrate.ts
// Runs pending Drizzle migrations against DATABASE_URL. Called at boot from
// `index.ts` before `app.listen`, and as a standalone script via
// `pnpm --filter @hc/backend exec tsx src/db/migrate.ts` for one-off use.

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';

/**
 * Applies any pending migrations. Uses a short-lived single connection so it
 * does not interfere with the long-lived runtime pool.
 */
export const runMigrations = async (): Promise<void> => {
  const client = postgres(config.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    // eslint-disable-next-line no-console
    console.log('[hc] DB migrations applied');
  } finally {
    await client.end({ timeout: 5 });
  }
};

// Run directly when invoked as a script.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runMigrations().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
