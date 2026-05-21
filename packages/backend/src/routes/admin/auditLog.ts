// routes/admin/auditLog.ts
// Read-only paginated view of the audit trail. Used by the admin UI to
// inspect who did what — never contains individual ballot content.
//
//   GET /api/admin/audit-log?limit=100&before=<iso>

import { Router } from 'express';
import { desc, eq, lt } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { auditLog, users } from '../../db/schema/index.js';

export const adminAuditLogRoute = Router();

adminAuditLogRoute.get('/', async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500);
  const beforeRaw = typeof req.query.before === 'string' ? req.query.before : null;
  const before = beforeRaw ? new Date(beforeRaw) : null;

  try {
    const rows = await db
      .select({
        id: auditLog.id,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorEmail: users.email,
        actorName: users.fullName,
        meta: auditLog.meta,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(before ? lt(auditLog.createdAt, before) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return res.status(200).json({
      entries: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] audit log read failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});
