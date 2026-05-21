// routes/auth.ts
// Magic-link login flow + session lifecycle.
//
//   POST /api/auth/request  → email a one-shot link (returns ok even on unknown
//                              email — no enumeration).
//   POST /api/auth/verify   → exchange the token from the link for a session.
//   POST /api/auth/logout   → revoke the current session.

import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  type MagicLinkVerifyResult,
  type UserRole,
} from '@hc/shared';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { magicLinkTokens, sessions, users } from '../db/schema/index.js';
import { generateToken, sha256Hex, timingSafeEqualHex } from '../services/crypto.js';
import { sendMagicLinkEmail } from '../services/voteEmail.js';
import { recordAudit } from '../services/auditService.js';
import { requireAuth } from '../middleware/auth.js';
import {
  magicLinkRequestLimiter,
  magicLinkVerifyLimiter,
} from '../middleware/rateLimits.js';

export const authRoute = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/request
// ─────────────────────────────────────────────────────────────────────────────

authRoute.post('/request', magicLinkRequestLimiter, async (req, res) => {
  const parsed = magicLinkRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    // Still respond ok=true to avoid leaking whether the body shape was valid.
    return res.status(200).json({ ok: true });
  }

  const { email } = parsed.data;

  try {
    const found = await db
      .select({ id: users.id, fullName: users.fullName, active: users.active })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = found[0];
    if (user && user.active) {
      const rawToken = generateToken(32);
      const tokenHash = sha256Hex(rawToken);
      const ttlMs = config.VOTE_MAGIC_LINK_TTL_HOURS * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs);

      await db.insert(magicLinkTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      await sendMagicLinkEmail({
        to: email,
        fullName: user.fullName,
        rawToken,
        ttlHours: config.VOTE_MAGIC_LINK_TTL_HOURS,
      });

      await recordAudit({
        entityType: 'user',
        entityId: user.id,
        action: 'magic_link_requested',
        actorId: user.id,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] magic-link request failed:', err);
    // Do not leak the failure mode — still respond ok.
  }

  return res.status(200).json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify
// ─────────────────────────────────────────────────────────────────────────────

authRoute.post('/verify', magicLinkVerifyLimiter, async (req, res) => {
  const parsed = magicLinkVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'invalid_token' });
  }

  const { token } = parsed.data;
  const tokenHash = sha256Hex(token);

  try {
    const rows = await db
      .select({
        id: magicLinkTokens.id,
        userId: magicLinkTokens.userId,
        expiresAt: magicLinkTokens.expiresAt,
        usedAt: magicLinkTokens.usedAt,
        storedHash: magicLinkTokens.tokenHash,
      })
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.tokenHash, tokenHash))
      .limit(1);

    const link = rows[0];
    if (!link || !timingSafeEqualHex(link.storedHash, tokenHash)) {
      return res.status(401).json({ message: 'invalid_token' });
    }
    if (link.usedAt !== null) {
      return res.status(401).json({ message: 'token_used' });
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ message: 'token_expired' });
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        level: users.level,
        role: users.role,
        active: users.active,
      })
      .from(users)
      .where(eq(users.id, link.userId))
      .limit(1);

    const user = userRows[0];
    if (!user || !user.active) {
      return res.status(401).json({ message: 'invalid_token' });
    }

    // Mint the session token. The raw value travels back to the client once;
    // only its hash persists in the DB.
    const rawSessionToken = generateToken(32);
    const sessionHash = sha256Hex(rawSessionToken);
    const sessionTtlMs = config.VOTE_SESSION_TTL_MINUTES * 60 * 1000;
    const sessionExpiresAt = new Date(Date.now() + sessionTtlMs);

    // Mark link as used + create session in one transaction.
    const sessionRow = await db.transaction(async (tx) => {
      const used = await tx
        .update(magicLinkTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(magicLinkTokens.id, link.id), isNull(magicLinkTokens.usedAt)))
        .returning({ id: magicLinkTokens.id });

      if (used.length === 0) {
        // Concurrent consumer beat us to it.
        throw new Error('token_already_used');
      }

      const inserted = await tx
        .insert(sessions)
        .values({
          userId: user.id,
          tokenHash: sessionHash,
          expiresAt: sessionExpiresAt,
        })
        .returning({ id: sessions.id });

      return inserted[0];
    });

    await recordAudit({
      entityType: 'session',
      entityId: sessionRow?.id ?? '00000000-0000-0000-0000-000000000000',
      action: 'session_created',
      actorId: user.id,
    });

    const result: MagicLinkVerifyResult = {
      sessionToken: rawSessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        level: user.level as 1 | 2 | 3,
        role: user.role as UserRole,
        active: user.active,
      },
    };
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'token_already_used') {
      return res.status(401).json({ message: 'token_used' });
    }
    // eslint-disable-next-line no-console
    console.error('[hc] verify failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

authRoute.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.sessionId) {
      await db.delete(sessions).where(eq(sessions.id, req.sessionId));
      await recordAudit({
        entityType: 'session',
        entityId: req.sessionId,
        action: 'session_revoked',
        actorId: req.user?.id ?? null,
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] logout failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});
