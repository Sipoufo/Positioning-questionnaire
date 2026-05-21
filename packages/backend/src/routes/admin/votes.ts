// routes/admin/votes.ts
// Admin-only CRUD over votes + open/cancel transitions.
//
//   GET    /api/admin/votes          → list every vote (any status)
//   POST   /api/admin/votes          → create a draft (with options)
//   GET    /api/admin/votes/:id      → admin detail (always succeeds, any status)
//   PATCH  /api/admin/votes/:id      → update fields + options (draft only)
//   POST   /api/admin/votes/:id/open → flip to status=open, snapshot eligibility
//   DELETE /api/admin/votes/:id      → cancel (draft only)
//
// All routes require `requireAdmin` — mounted with the middleware in index.ts.

import { Router } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  createVoteSchema,
  type CreateVotePayload,
  type PublicVoteOption,
  type RoundResult,
} from '@hc/shared';
import { config } from '../../config.js';
import { db } from '../../db/connection.js';
import {
  ballots,
  eligibleVoters,
  magicLinkTokens,
  participations,
  users,
  voteOptions,
  voteRounds,
  safeVoteColumns,
  votes,
} from '../../db/schema/index.js';
import { recordAudit } from '../../services/auditService.js';
import { closeVoteRound, openVote, VoteLogicError } from '../../services/voteLogic.js';
import { computeReceiptCode } from '../../services/anonymity.js';
import { renderVoteResultsPdf } from '../../services/voteResultsPdf.js';
import { sendMagicLinkEmail, sendVoteResultsEmail } from '../../services/voteEmail.js';
import { generateToken, sha256Hex } from '../../services/crypto.js';

export const adminVotesRoute = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mapVoteLogicError = (code: VoteLogicError['code']): number => {
  switch (code) {
    case 'vote_not_found':
    case 'round_not_found':
      return 404;
    case 'vote_not_in_draft':
    case 'vote_not_open':
    case 'round_not_open':
      return 409;
    default:
      return 400;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/votes
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.get('/', async (_req, res) => {
  try {
    const rows = await db.select(safeVoteColumns).from(votes).orderBy(desc(votes.createdAt));
    return res.status(200).json({ votes: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] list votes failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/votes — create draft + round 1 + options
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.post('/', async (req, res) => {
  const parsed = createVoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'invalid_payload',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'unauthorized' });
  }

  const data: CreateVotePayload = parsed.data;

  try {
    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(votes)
        .values({
          title: data.title,
          description: data.description ?? null,
          mode: data.mode,
          scrutinType: data.scrutinType,
          maxChoices: data.maxChoices,
          allowBlank: data.allowBlank,
          eligibleLevels: data.eligibleLevels as number[],
          quorumPct: String(data.quorumPct),
          majorityType: data.majorityType,
          majorityBase: data.majorityBase,
          resultVisibility: data.resultVisibility,
          openAt: data.openAt ? new Date(data.openAt) : null,
          closeAt: data.closeAt ? new Date(data.closeAt) : null,
          closeMode: data.closeMode,
          status: 'draft',
          multiRound: data.multiRound,
          topNForRound2: data.topNForRound2,
          createdBy: req.user!.id,
        })
        .returning();

      const vote = inserted[0]!;

      // Round 1 holds the options for the draft. Status stays 'open' on the
      // round itself but vote.status='draft' gates voter access.
      const roundRows = await tx
        .insert(voteRounds)
        .values({
          voteId: vote.id,
          roundNumber: 1,
          status: 'open',
          openAt: new Date(),
          closeAt: data.closeAt ? new Date(data.closeAt) : null,
        })
        .returning({ id: voteRounds.id });

      const roundId = roundRows[0]!.id;

      await tx.insert(voteOptions).values(
        data.options.map((o, idx) => ({
          voteId: vote.id,
          roundId,
          labelFr: o.labelFr,
          labelEn: o.labelEn,
          displayOrder: idx,
        })),
      );

      return { vote, roundId };
    });

    await recordAudit({
      entityType: 'vote',
      entityId: created.vote.id,
      action: 'vote_created',
      actorId: req.user.id,
      meta: { title: created.vote.title, mode: created.vote.mode },
    });

    return res.status(201).json({ vote: created.vote });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] create vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/votes/:id
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }

  try {
    const voteRows = await db.select(safeVoteColumns).from(votes).where(eq(votes.id, id)).limit(1);

    // (anonymousKey explicitly excluded — never serve the encrypted secret).
    const vote = voteRows[0];
    if (!vote) return res.status(404).json({ message: 'not_found' });

    const rounds = await db
      .select()
      .from(voteRounds)
      .where(eq(voteRounds.voteId, id))
      .orderBy(asc(voteRounds.roundNumber));

    const opts = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, id))
      .orderBy(asc(voteOptions.displayOrder));

    const optionsByRound = new Map<string, PublicVoteOption[]>();
    for (const o of opts) {
      const arr = optionsByRound.get(o.roundId) ?? [];
      arr.push({
        id: o.id,
        labelFr: o.labelFr,
        labelEn: o.labelEn,
        displayOrder: o.displayOrder,
      });
      optionsByRound.set(o.roundId, arr);
    }

    const roundsWithOpts = rounds.map((r) => ({
      ...r,
      options: optionsByRound.get(r.id) ?? [],
    }));

    return res.status(200).json({ vote, rounds: roundsWithOpts });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] admin get vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/votes/:id — draft only, full replace of options if provided
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.patch('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }
  const parsed = createVoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'invalid_payload',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const data = parsed.data;

  try {
    const existing = (
      await db.select({ status: votes.status }).from(votes).where(eq(votes.id, id)).limit(1)
    )[0];
    if (!existing) return res.status(404).json({ message: 'not_found' });
    if (existing.status !== 'draft') return res.status(409).json({ message: 'vote_not_in_draft' });

    await db.transaction(async (tx) => {
      await tx
        .update(votes)
        .set({
          title: data.title,
          description: data.description ?? null,
          mode: data.mode,
          scrutinType: data.scrutinType,
          maxChoices: data.maxChoices,
          allowBlank: data.allowBlank,
          eligibleLevels: data.eligibleLevels as number[],
          quorumPct: String(data.quorumPct),
          majorityType: data.majorityType,
          majorityBase: data.majorityBase,
          resultVisibility: data.resultVisibility,
          openAt: data.openAt ? new Date(data.openAt) : null,
          closeAt: data.closeAt ? new Date(data.closeAt) : null,
          closeMode: data.closeMode,
          multiRound: data.multiRound,
          topNForRound2: data.topNForRound2,
          updatedAt: new Date(),
        })
        .where(eq(votes.id, id));

      const round = (
        await tx
          .select({ id: voteRounds.id })
          .from(voteRounds)
          .where(and(eq(voteRounds.voteId, id), eq(voteRounds.roundNumber, 1)))
          .limit(1)
      )[0];
      if (!round) throw new Error('round_1_missing');

      await tx
        .update(voteRounds)
        .set({ closeAt: data.closeAt ? new Date(data.closeAt) : null })
        .where(eq(voteRounds.id, round.id));

      await tx.delete(voteOptions).where(eq(voteOptions.roundId, round.id));
      await tx.insert(voteOptions).values(
        data.options.map((o, idx) => ({
          voteId: id,
          roundId: round.id,
          labelFr: o.labelFr,
          labelEn: o.labelEn,
          displayOrder: idx,
        })),
      );
    });

    await recordAudit({
      entityType: 'vote',
      entityId: id,
      action: 'vote_updated',
      actorId: req.user?.id ?? null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] update vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/votes/:id/open
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.post<{ id: string }>('/:id/open', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const result = await openVote(id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof VoteLogicError) {
      return res.status(mapVoteLogicError(err.code)).json({ message: err.code });
    }
    // eslint-disable-next-line no-console
    console.error('[hc] open vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/votes/:id/close — close the latest open round
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.post<{ id: string }>('/:id/close', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const latest = (
      await db
        .select({
          id: voteRounds.id,
          status: voteRounds.status,
          roundNumber: voteRounds.roundNumber,
        })
        .from(voteRounds)
        .where(eq(voteRounds.voteId, id))
        .orderBy(desc(voteRounds.roundNumber))
        .limit(1)
    )[0];
    if (!latest) return res.status(404).json({ message: 'not_found' });
    if (latest.status !== 'open')
      return res.status(409).json({ message: 'round_not_open' });

    const result = await closeVoteRound(latest.id, req.user.id);

    // Generate the PDF + email it to the admin. Best-effort: a mailing
    // failure must not roll back the close — log and continue.
    try {
      const voteRow = (await db.select(safeVoteColumns).from(votes).where(eq(votes.id, id)).limit(1))[0];
      const opts = await db
        .select()
        .from(voteOptions)
        .where(eq(voteOptions.roundId, latest.id));
      const ballotRows = await db
        .select({
          id: ballots.id,
          ballotToken: ballots.ballotToken,
          choices: ballots.choices,
          isBlank: ballots.isBlank,
        })
        .from(ballots)
        .where(eq(ballots.roundId, latest.id));

      const labels = new Map(opts.map((o) => [o.id, o.labelFr]));
      const receipts = ballotRows.map((b) => ({
        code: computeReceiptCode(
          b.ballotToken ?? b.id,
          id,
          b.choices as string[],
        ),
        choiceLabels: (b.choices as string[]).map((cid) => labels.get(cid) ?? cid),
        isBlank: b.isBlank,
      }));

      if (voteRow) {
        const pdfBuffer = await renderVoteResultsPdf({
          voteTitle: voteRow.title,
          roundNumber: latest.roundNumber,
          locale: 'fr',
          closedAt: new Date().toISOString(),
          result: result.result,
          optionLabels: labels,
          receipts,
          majorityType: voteRow.majorityType,
          majorityBase: voteRow.majorityBase,
          quorumPct: Number(voteRow.quorumPct),
        });

        const verdict = result.result.majorityMet
          ? 'Majorité atteinte'
          : result.nextRoundId
            ? 'Pas de majorité — tour 2 ouvert'
            : 'Pas de majorité';

        await sendVoteResultsEmail({
          to: config.ADMIN_EMAIL,
          voteTitle: voteRow.title,
          roundNumber: latest.roundNumber,
          participation: `${result.result.totalBallots}/${result.result.totalEligible} (${result.result.participationPct.toFixed(1)}%)`,
          verdict,
          pdfBuffer,
        });
      }
    } catch (mailErr) {
      // eslint-disable-next-line no-console
      console.error('[hc] post-close email failed:', mailErr);
    }

    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof VoteLogicError) {
      return res.status(mapVoteLogicError(err.code)).json({ message: err.code });
    }
    // eslint-disable-next-line no-console
    console.error('[hc] close vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/votes/:id/participation
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.get<{ id: string }>('/:id/participation', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });

  try {
    const latest = (
      await db
        .select({ id: voteRounds.id, roundNumber: voteRounds.roundNumber })
        .from(voteRounds)
        .where(eq(voteRounds.voteId, id))
        .orderBy(desc(voteRounds.roundNumber))
        .limit(1)
    )[0];
    if (!latest) return res.status(404).json({ message: 'not_found' });

    const eligible = await db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
      })
      .from(eligibleVoters)
      .innerJoin(users, eq(users.id, eligibleVoters.userId))
      .where(eq(eligibleVoters.voteId, id))
      .orderBy(asc(users.fullName));

    const voters = await db
      .select({ userId: participations.userId, votedAt: participations.votedAt })
      .from(participations)
      .where(eq(participations.roundId, latest.id));
    const votedMap = new Map(voters.map((v) => [v.userId, v.votedAt]));

    const list = eligible.map((e) => ({
      userId: e.userId,
      email: e.email,
      fullName: e.fullName,
      hasVoted: votedMap.has(e.userId),
      votedAt: votedMap.get(e.userId)?.toISOString() ?? null,
    }));

    return res.status(200).json({
      roundId: latest.id,
      roundNumber: latest.roundNumber,
      totalEligible: list.length,
      totalVoted: voters.length,
      voters: list,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] participation failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/votes/:id/remind/:userId — resend a fresh magic link
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.post<{ id: string; userId: string }>(
  '/:id/remind/:userId',
  async (req, res) => {
    const voteId = req.params.id;
    const userId = req.params.userId;
    if (!voteId || !UUID_RE.test(voteId)) return res.status(400).json({ message: 'invalid_id' });
    if (!userId || !UUID_RE.test(userId)) return res.status(400).json({ message: 'invalid_id' });

    try {
      const u = (
        await db
          .select({ email: users.email, fullName: users.fullName, active: users.active })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      )[0];
      if (!u || !u.active) return res.status(404).json({ message: 'not_found' });

      const rawToken = generateToken(32);
      const ttlMs = config.VOTE_MAGIC_LINK_TTL_HOURS * 60 * 60 * 1000;
      await db.insert(magicLinkTokens).values({
        userId,
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(Date.now() + ttlMs),
      });

      await sendMagicLinkEmail({
        to: u.email,
        fullName: u.fullName,
        rawToken,
        ttlHours: config.VOTE_MAGIC_LINK_TTL_HOURS,
      });

      await recordAudit({
        entityType: 'vote',
        entityId: voteId,
        action: 'reminder_sent',
        actorId: req.user?.id ?? null,
        meta: { targetUserId: userId },
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[hc] remind failed:', err);
      return res.status(500).json({ message: 'internal_error' });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/votes/:id/results — admin always sees results
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.get<{ id: string }>('/:id/results', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });

  try {
    const rounds = await db
      .select()
      .from(voteRounds)
      .where(eq(voteRounds.voteId, id))
      .orderBy(asc(voteRounds.roundNumber));
    if (rounds.length === 0) return res.status(404).json({ message: 'not_found' });

    const opts = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, id))
      .orderBy(asc(voteOptions.displayOrder));
    const labelsByOption = new Map(opts.map((o) => [o.id, { fr: o.labelFr, en: o.labelEn }]));

    const out = rounds.map((r) => ({
      roundId: r.id,
      roundNumber: r.roundNumber,
      status: r.status,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      result: (r.result as RoundResult | null) ?? null,
      optionLabels: opts
        .filter((o) => o.roundId === r.id)
        .map((o) => ({ id: o.id, labelFr: o.labelFr, labelEn: o.labelEn })),
    }));

    return res.status(200).json({ rounds: out, labelsByOption: Object.fromEntries(labelsByOption) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] admin results failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/votes/:id — cancel (draft only)
// ─────────────────────────────────────────────────────────────────────────────

adminVotesRoute.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ message: 'invalid_id' });
  }

  try {
    const existing = (
      await db.select({ status: votes.status }).from(votes).where(eq(votes.id, id)).limit(1)
    )[0];
    if (!existing) return res.status(404).json({ message: 'not_found' });
    if (existing.status !== 'draft') return res.status(409).json({ message: 'vote_not_in_draft' });

    await db.update(votes).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(votes.id, id));

    await recordAudit({
      entityType: 'vote',
      entityId: id,
      action: 'vote_cancelled',
      actorId: req.user?.id ?? null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] cancel vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});
