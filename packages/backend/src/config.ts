// config.ts
// Centralizes environment variables. Throws on boot if a required value is missing
// — fail fast rather than discovering it on the first request.

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load env from the backend package first, then fall back to the repo root.
// This keeps `pnpm --filter @hc/backend dev` working when the only .env lives
// at the monorepo root (the typical setup — see .env.example).
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, '../.env'),
  resolve(here, '../../../.env'),
];
for (const path of candidates) {
  if (existsSync(path)) {
    loadEnv({ path });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((v) => Number.parseInt(v, 10)),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z
    .string()
    .default('465')
    .transform((v) => Number.parseInt(v, 10)),
  SMTP_SECURE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),

  MAIL_FROM_NAME: z.string().default('Happy Cash'),
  MAIL_FROM_ADDRESS: z.string().email(),
  ADMIN_EMAIL: z.string().email(),

  // Vote module — Postgres + crypto + magic-link config.
  DATABASE_URL: z.string().min(1),
  ANONYMITY_MASTER_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ANONYMITY_MASTER_KEY must be 64 hex chars (32 bytes)'),
  VOTE_MAGIC_LINK_TTL_HOURS: z
    .string()
    .default('24')
    .transform((v) => Number.parseInt(v, 10)),
  VOTE_SESSION_TTL_MINUTES: z
    .string()
    .default('30')
    .transform((v) => Number.parseInt(v, 10)),
  VOTE_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const corsOrigins = config.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
