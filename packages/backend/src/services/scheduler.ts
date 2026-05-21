// scheduler.ts
// In-process cron driving two automated transitions:
//
//   - auto-open  : drafts whose `open_at` has passed flip to `open` and
//                  snapshot eligibility (same code path as the admin button).
//   - auto-close : open votes with `close_mode='auto'` and `close_at` passed
//                  trigger the tally + (optional) round-2 creation.
//
// Both jobs are idempotent at the DB layer (`UPDATE WHERE status='X'` +
// advisory lock in closeVoteRound), so a missed tick during a container
// restart simply catches up on the next minute.

import cron from 'node-cron';
import { and, eq, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { voteRounds, votes } from '../db/schema/index.js';
import { closeVoteRound, openVote } from './voteLogic.js';

let started = false;

const tickAutoOpen = async (): Promise<void> => {
  const due = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.status, 'draft'), lte(votes.openAt, new Date())));
  for (const v of due) {
    try {
      await openVote(v.id, null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[hc][scheduler] auto-open failed for vote', v.id, err);
    }
  }
};

const tickAutoClose = async (): Promise<void> => {
  // Latest still-open round per vote whose vote close_at has passed and
  // close_mode is auto.
  const due = await db
    .select({
      roundId: voteRounds.id,
    })
    .from(voteRounds)
    .innerJoin(votes, eq(votes.id, voteRounds.voteId))
    .where(
      and(
        eq(voteRounds.status, 'open'),
        eq(votes.status, 'open'),
        eq(votes.closeMode, 'auto'),
        lte(votes.closeAt, new Date()),
      ),
    );
  for (const r of due) {
    try {
      await closeVoteRound(r.roundId, null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[hc][scheduler] auto-close failed for round', r.roundId, err);
    }
  }
};

/** Boots the cron once. Safe to call multiple times — no-op after the first. */
export const startScheduler = (): void => {
  if (started) return;
  started = true;

  // Every minute. Both jobs are cheap; if either grows, split the cadence.
  cron.schedule('* * * * *', () => {
    void (async () => {
      try {
        await tickAutoOpen();
        await tickAutoClose();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[hc][scheduler] tick failed:', err);
      }
    })();
  });

  // eslint-disable-next-line no-console
  console.log('[hc] Scheduler started (auto-open + auto-close every minute)');
};
