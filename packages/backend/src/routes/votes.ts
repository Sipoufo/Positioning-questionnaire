// routes/votes.ts
// Voter-facing endpoints. All require `requireAuth`.
//
//   GET  /api/votes                                   → votes visible to me
//   GET  /api/votes/:id                               → vote detail + current round
//   GET  /api/votes/:id/my-participation              → did I vote yet?
//   POST /api/votes/:id/rounds/:roundId/ballot        → cast my ballot

import { Router } from 'express';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  ballotPayloadSchema,
  type PublicVoteOption,
  type RoundResult,
  type VoteDetail,
  type VoteMode,
  type VoteSummary,
} from '@hc/shared';
import { db } from '../db/connection.js';
import {
  eligibleVoters,
  participations,
  safeVoteColumns,
  voteOptions,
  voteRounds,
  votes,
} from '../db/schema/index.js';
import { castBallot, VoteLogicError } from '../services/voteLogic.js';
import { ballotCastLimiter } from '../middleware/rateLimits.js';
import { requireAuth } from '../middleware/auth.js';

export const votesRoute = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mapVoteLogicError = (code: VoteLogicError['code']): number => {
  switch (code) {
    case 'vote_not_found':
    case 'round_not_found':
      return 404;
    case 'vote_not_open':
    case 'round_not_open':
    case 'already_voted':
      return 409;
    case 'not_eligible':
      return 403;
    case 'blank_not_allowed':
    case 'invalid_choice_count':
    case 'unknown_option':
      return 400;
    default:
      return 400;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/votes — votes the current user is eligible for
// ─────────────────────────────────────────────────────────────────────────────

votesRoute.get('/', requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const rows = await db
      .select({
        id: votes.id,
        title: votes.title,
        mode: votes.mode,
        status: votes.status,
        closeAt: votes.closeAt,
      })
      .from(votes)
      .innerJoin(eligibleVoters, eq(eligibleVoters.voteId, votes.id))
      .where(
        and(
          eq(eligibleVoters.userId, req.user.id),
          inArray(votes.status, ['open', 'closed'] as const),
        ),
      )
      .orderBy(desc(votes.openAt));

    if (rows.length === 0) {
      return res.status(200).json({ votes: [] as VoteSummary[] });
    }

    const voteIds = rows.map((r) => r.id);

    const rounds = await db
      .select({
        id: voteRounds.id,
        voteId: voteRounds.voteId,
        roundNumber: voteRounds.roundNumber,
      })
      .from(voteRounds)
      .where(inArray(voteRounds.voteId, voteIds))
      .orderBy(desc(voteRounds.roundNumber));

    const currentRoundByVote = new Map<string, { id: string; roundNumber: number }>();
    for (const r of rounds) {
      if (!currentRoundByVote.has(r.voteId)) {
        currentRoundByVote.set(r.voteId, { id: r.id, roundNumber: r.roundNumber });
      }
    }

    const myParts = await db
      .select({ roundId: participations.roundId })
      .from(participations)
      .where(
        and(
          eq(participations.userId, req.user.id),
          inArray(
            participations.roundId,
            rounds.map((r) => r.id),
          ),
        ),
      );
    const votedRoundIds = new Set(myParts.map((p) => p.roundId));

    const summaries: VoteSummary[] = rows.map((r) => {
      const current = currentRoundByVote.get(r.id);
      const hasVoted = current ? votedRoundIds.has(current.id) : false;
      return {
        id: r.id,
        title: r.title,
        mode: r.mode as VoteMode,
        status: r.status as VoteSummary['status'],
        closeAt: r.closeAt ? r.closeAt.toISOString() : null,
        currentRoundNumber: current?.roundNumber ?? 0,
        hasVoted,
      };
    });

    return res.status(200).json({ votes: summaries });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] list votes failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/votes/:id — vote detail + current round (must be eligible)
// ─────────────────────────────────────────────────────────────────────────────

votesRoute.get<{ id: string }>('/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const eligible = await db
      .select({ id: eligibleVoters.id })
      .from(eligibleVoters)
      .where(and(eq(eligibleVoters.voteId, id), eq(eligibleVoters.userId, req.user.id)))
      .limit(1);
    if (eligible.length === 0) return res.status(403).json({ message: 'not_eligible' });

    const voteRow = (await db.select(safeVoteColumns).from(votes).where(eq(votes.id, id)).limit(1))[0];
    if (!voteRow) return res.status(404).json({ message: 'not_found' });

    const round = (
      await db
        .select()
        .from(voteRounds)
        .where(eq(voteRounds.voteId, id))
        .orderBy(desc(voteRounds.roundNumber))
        .limit(1)
    )[0];
    if (!round) return res.status(404).json({ message: 'not_found' });

    const opts = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.roundId, round.id))
      .orderBy(asc(voteOptions.displayOrder));

    const part = await db
      .select({ id: participations.id })
      .from(participations)
      .where(and(eq(participations.roundId, round.id), eq(participations.userId, req.user.id)))
      .limit(1);

    const options: PublicVoteOption[] = opts.map((o) => ({
      id: o.id,
      labelFr: o.labelFr,
      labelEn: o.labelEn,
      displayOrder: o.displayOrder,
    }));

    const detail: VoteDetail = {
      id: voteRow.id,
      title: voteRow.title,
      description: voteRow.description,
      mode: voteRow.mode as VoteDetail['mode'],
      scrutinType: voteRow.scrutinType as VoteDetail['scrutinType'],
      maxChoices: voteRow.maxChoices,
      allowBlank: voteRow.allowBlank,
      eligibleLevels: voteRow.eligibleLevels as VoteDetail['eligibleLevels'],
      quorumPct: Number(voteRow.quorumPct),
      majorityType: voteRow.majorityType as VoteDetail['majorityType'],
      majorityBase: voteRow.majorityBase as VoteDetail['majorityBase'],
      resultVisibility: voteRow.resultVisibility as VoteDetail['resultVisibility'],
      openAt: voteRow.openAt ? voteRow.openAt.toISOString() : null,
      closeAt: voteRow.closeAt ? voteRow.closeAt.toISOString() : null,
      closeMode: voteRow.closeMode as VoteDetail['closeMode'],
      status: voteRow.status as VoteDetail['status'],
      multiRound: voteRow.multiRound,
      topNForRound2: voteRow.topNForRound2,
      currentRound: {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status as 'open' | 'closed',
        openAt: round.openAt.toISOString(),
        closeAt: round.closeAt ? round.closeAt.toISOString() : null,
        closedAt: round.closedAt ? round.closedAt.toISOString() : null,
        options,
      },
      hasVoted: part.length > 0,
    };

    return res.status(200).json({ vote: detail });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] get vote failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/votes/:id/my-participation
// ─────────────────────────────────────────────────────────────────────────────

votesRoute.get<{ id: string }>('/:id/my-participation', requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const round = (
      await db
        .select({ id: voteRounds.id })
        .from(voteRounds)
        .where(eq(voteRounds.voteId, id))
        .orderBy(desc(voteRounds.roundNumber))
        .limit(1)
    )[0];
    if (!round) return res.status(200).json({ participated: false });

    const part = (
      await db
        .select({ votedAt: participations.votedAt })
        .from(participations)
        .where(and(eq(participations.roundId, round.id), eq(participations.userId, req.user.id)))
        .limit(1)
    )[0];

    return res.status(200).json({
      participated: Boolean(part),
      votedAt: part ? part.votedAt.toISOString() : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] my-participation failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/votes/:id/results — gated by vote.result_visibility
// ─────────────────────────────────────────────────────────────────────────────

votesRoute.get<{ id: string }>('/:id/results', requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ message: 'invalid_id' });
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  try {
    const eligible = await db
      .select({ id: eligibleVoters.id })
      .from(eligibleVoters)
      .where(and(eq(eligibleVoters.voteId, id), eq(eligibleVoters.userId, req.user.id)))
      .limit(1);
    if (eligible.length === 0) return res.status(403).json({ message: 'not_eligible' });

    const vote = (await db.select(safeVoteColumns).from(votes).where(eq(votes.id, id)).limit(1))[0];
    if (!vote) return res.status(404).json({ message: 'not_found' });

    // Gating per `result_visibility`:
    //   - admin_only : never to members
    //   - on_close   : only after the vote is closed
    //   - immediate  : as soon as a participation row exists for this user
    if (vote.resultVisibility === 'admin_only') {
      return res.status(403).json({ message: 'results_hidden' });
    }
    if (vote.resultVisibility === 'on_close' && vote.status !== 'closed') {
      return res.status(409).json({ message: 'results_pending_close' });
    }
    if (vote.resultVisibility === 'immediate') {
      const myPart = await db
        .select({ id: participations.id })
        .from(participations)
        .innerJoin(voteRounds, eq(voteRounds.id, participations.roundId))
        .where(and(eq(voteRounds.voteId, id), eq(participations.userId, req.user.id)))
        .limit(1);
      if (myPart.length === 0) {
        return res.status(409).json({ message: 'must_vote_first' });
      }
    }

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

    return res.status(200).json({
      vote: {
        id: vote.id,
        title: vote.title,
        status: vote.status,
        mode: vote.mode,
      },
      rounds: rounds.map((r) => ({
        roundId: r.id,
        roundNumber: r.roundNumber,
        status: r.status,
        closedAt: r.closedAt ? r.closedAt.toISOString() : null,
        result: (r.result as RoundResult | null) ?? null,
        options: opts
          .filter((o) => o.roundId === r.id)
          .map((o) => ({
            id: o.id,
            labelFr: o.labelFr,
            labelEn: o.labelEn,
            displayOrder: o.displayOrder,
          })),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hc] member results failed:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/votes/:id/rounds/:roundId/ballot — cast
// ─────────────────────────────────────────────────────────────────────────────

votesRoute.post<{ id: string; roundId: string }>(
  '/:id/rounds/:roundId/ballot',
  ballotCastLimiter,
  requireAuth,
  async (req, res) => {
    const voteId = req.params.id;
    const roundId = req.params.roundId;
    if (!voteId || !UUID_RE.test(voteId)) return res.status(400).json({ message: 'invalid_id' });
    if (!roundId || !UUID_RE.test(roundId))
      return res.status(400).json({ message: 'invalid_id' });
    if (!req.user) return res.status(401).json({ message: 'unauthorized' });

    const parsed = ballotPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'invalid_payload',
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await castBallot(
        voteId,
        roundId,
        { id: req.user.id, level: req.user.level },
        parsed.data,
      );
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof VoteLogicError) {
        return res.status(mapVoteLogicError(err.code)).json({ message: err.code });
      }
      // eslint-disable-next-line no-console
      console.error('[hc] cast ballot failed:', err);
      return res.status(500).json({ message: 'internal_error' });
    }
  },
);
