// auth.ts
// Bearer-token authentication middleware. Reads `Authorization: Bearer
// <sessionToken>`, hashes it, looks up the matching `sessions` row, and
// attaches the resolved user to the request. A second middleware narrows
// the route to admins.

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import type { PublicUser, UserRole } from '@hc/shared';
import { db } from '../db/connection.js';
import { sessions, users } from '../db/schema/index.js';
import { sha256Hex } from '../services/crypto.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser;
    sessionId?: string;
  }
}

const extractBearer = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ', 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  return token;
};

/**
 * Loads the session for the bearer token, if any. Does NOT reject the
 * request — downstream `requireAuth` or `requireAdmin` enforce access.
 */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const raw = extractBearer(req.headers.authorization);
  if (!raw) return next();

  try {
    const rows = await db
      .select({
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          level: users.level,
          role: users.role,
          active: users.active,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, sha256Hex(raw)), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row || !row.user.active) return next();

    req.sessionId = row.sessionId;
    req.user = {
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      level: row.user.level as 1 | 2 | 3,
      role: row.user.role as UserRole,
      active: row.user.active,
    };
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] loadSession failed:', err);
    return next();
  }
};

/** Rejects unauthenticated requests with 401. */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'unauthorized' });
    return;
  }
  next();
};

/** Rejects non-admin requests with 403. Implies `requireAuth`. */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'unauthorized' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'forbidden' });
    return;
  }
  next();
};
