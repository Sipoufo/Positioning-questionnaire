// index.ts
// Express boot. Hardened with helmet + rate limiter + CORS allowlist. Only one
// route is exposed: POST /api/submit.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, corsOrigins } from './config.js';
import { submitRoute } from './routes/submit.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / curl (no Origin header) and any explicitly allowed origin.
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS: origin not allowed'));
    },
  }),
);

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/submit', submitRoute);

// JSON error handler — never leak stack traces in production.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'internal_error' });
});

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[hc] API listening on :${config.PORT} (${config.NODE_ENV})`);
});
