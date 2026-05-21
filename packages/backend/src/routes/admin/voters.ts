// routes/admin/voters.ts
// Admin-only CRUD over voter accounts.
//
//   GET    /api/admin/voters      → list
//   POST   /api/admin/voters      → create
//   PATCH  /api/admin/voters/:id  → partial update
//   DELETE /api/admin/voters/:id  → soft delete (active = false)
//
// All routes require `requireAdmin` — mounted with the middleware in index.ts.

import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import {
  createVoterSchema,
  updateVoterSchema,
  type PublicUser,
  type UserRole,
} from '@hc/shared';
import { db } from '../../db/connection.js';
import { users } from '../../db/schema/index.js';
import { recordAudit } from '../../services/auditService.js';

export const adminVotersRoute = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toPublicUser = (u: typeof users.$inferSelect): PublicUser => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  level: u.level as 1 | 2 | 3,
  role: u.role as UserRole,
  active: u.active,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/voters
// ─────────────────────────────────────────────────────────────────────────────

adminVotersRoute.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(asc(users.fullName));
    return res.status(200).json({ voters: rows.map(toPublicUser) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] list voters failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/voters
// ─────────────────────────────────────────────────────────────────────────────

adminVotersRoute.post('/', async (req, res) => {
  const parsed = createVoterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'invalid_payload',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'email_already_exists' });
    }

    const inserted = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        level: parsed.data.level,
        role: parsed.data.role,
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      return res.status(500).json({ message: 'internal_error' });
    }

    await recordAudit({
      entityType: 'user',
      entityId: created.id,
      action: 'user_created',
      actorId: req.user?.id ?? null,
      meta: { email: created.email, level: created.level, role: created.role },
    });

    return res.status(201).json({ voter: toPublicUser(created) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] create voter failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/voters/:id
// ─────────────────────────────────────────────────────────────────────────────

adminVotersRoute.patch('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }

  const parsed = updateVoterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'invalid_payload',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    // Email-uniqueness pre-check to give a friendly error before the
    // unique-constraint violation reaches us.
    if (parsed.data.email) {
      const dup = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);
      if (dup[0] && dup[0].id !== id) {
        return res.status(409).json({ message: 'email_already_exists' });
      }
    }

    const updated = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const row = updated[0];
    if (!row) {
      return res.status(404).json({ message: 'not_found' });
    }

    await recordAudit({
      entityType: 'user',
      entityId: row.id,
      action: 'user_updated',
      actorId: req.user?.id ?? null,
      meta: parsed.data as Record<string, unknown>,
    });

    return res.status(200).json({ voter: toPublicUser(row) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] update voter failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/voters/:id  (soft delete — flips `active` to false)
// ─────────────────────────────────────────────────────────────────────────────

adminVotersRoute.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }

  try {
    const updated = await db
      .update(users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (updated.length === 0) {
      return res.status(404).json({ message: 'not_found' });
    }

    await recordAudit({
      entityType: 'user',
      entityId: id,
      action: 'user_deactivated',
      actorId: req.user?.id ?? null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] deactivate voter failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});
