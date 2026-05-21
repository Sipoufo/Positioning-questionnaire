// index.ts
// Express boot. Hardened with helmet + rate limiter + CORS allowlist. Routes:
//   POST   /api/submit                  — legacy questionnaire submission
//   POST   /api/auth/{request,verify,logout} — magic-link login flow
//   *      /api/admin/voters            — admin-only voter CRUD

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, corsOrigins } from './config.js';
import { submitRoute } from './routes/submit.js';
import { authRoute } from './routes/auth.js';
import { votesRoute } from './routes/votes.js';
import { adminVotersRoute } from './routes/admin/voters.js';
import { adminVotesRoute } from './routes/admin/votes.js';
import { adminAuditLogRoute } from './routes/admin/auditLog.js';
import { runMigrations } from './db/migrate.js';
import { loadSession, requireAdmin } from './middleware/auth.js';
import { startScheduler } from './services/scheduler.js';

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

// Global DoS shield. Per-route limiters in `middleware/rateLimits.ts` are
// stricter on sensitive endpoints (magic-link request, ballot cast).
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Tighter limit on the single-shot questionnaire submission to absorb its
// previous protection level (was the only route at the time).
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Bearer token → req.user / req.sessionId (silent on failure).
app.use('/api', loadSession);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/submit', submitLimiter, submitRoute);
app.use('/api/auth', authRoute);
app.use('/api/votes', votesRoute);
app.use('/api/admin/voters', requireAdmin, adminVotersRoute);
app.use('/api/admin/votes', requireAdmin, adminVotesRoute);
app.use('/api/admin/audit-log', requireAdmin, adminAuditLogRoute);

// JSON error handler — never leak stack traces in production.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'internal_error' });
});

// Run pending DB migrations before accepting traffic. Fail-fast if the DB
// is unreachable — better to crash on boot than to serve broken responses.
runMigrations()
  .then(() => {
    startScheduler();
    app.listen(config.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[hc] API listening on :${config.PORT} (${config.NODE_ENV})`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[hc] Boot aborted — migration failed:', err);
    process.exit(1);
  });
