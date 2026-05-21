// auditService.ts
// Append-only audit logger. Every meaningful action (vote opened, ballot
// cast, user updated, round closed) goes through here so the trail required
// by spec §3.5 (10-year retention) is built incrementally.

import { db } from '../db/connection.js';
import { auditLog } from '../db/schema/index.js';

export type AuditAction =
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'magic_link_requested'
  | 'magic_link_used'
  | 'session_created'
  | 'session_revoked'
  | 'vote_created'
  | 'vote_updated'
  | 'vote_cancelled'
  | 'vote_opened'
  | 'vote_closed'
  | 'round_created'
  | 'round_closed'
  | 'ballot_cast'
  | 'reminder_sent';

export type AuditEntity = 'user' | 'vote' | 'round' | 'ballot' | 'session';

interface RecordArgs {
  entityType: AuditEntity;
  entityId: string;
  action: AuditAction;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Writes one entry to the audit log. Never throws — a failure to log must
 * not break the user-visible flow, but is reported to stderr for ops.
 */
export const recordAudit = async (args: RecordArgs): Promise<void> => {
  try {
    await db.insert(auditLog).values({
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      actorId: args.actorId ?? null,
      meta: args.meta ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] audit log write failed:', err);
  }
};
