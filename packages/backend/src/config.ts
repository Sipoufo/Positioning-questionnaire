// config.ts
// Centralizes environment variables. Throws on boot if a required value is missing
// — fail fast rather than discovering it on the first request.

import 'dotenv/config';
import { z } from 'zod';

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
