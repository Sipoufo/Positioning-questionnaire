// drizzle.config.ts
// drizzle-kit configuration — used only by the CLI (generate, migrate, studio).
// The runtime DB client is built in `src/db/connection.ts`.

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// `generate` only reads the schema and doesn't need a live DB. `migrate` and
// `studio` do — they fail explicitly if the URL is missing.
const url = process.env.DATABASE_URL ?? 'postgresql://noop:noop@localhost:5432/noop';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
