// voteLogic.ts
// Business operations on votes. Every state-changing action goes through
// here so route handlers stay thin and tests can target the rules directly.
//
//   - `openVote(voteId, actorId)`          — moves a draft to open, snapshots
//                                             eligible voters, creates round 1
//   - `castBallot(voteId, roundId, userId, payload)` — atomic participation
//                                             + ballot insert with strict
//                                             anonymous-mode dissociation

import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import type {
  BallotPayload,
  MajorityBase,
  MajorityType,
  RoundResult,
  UserLevel,
} from '@hc/shared';
import { db } from '../db/connection.js';
import {
  ballots,
  eligibleVoters,
  participations,
  users,
  voteOptions,
  voteRounds,
  votes,
} from '../db/schema/index.js';
import { recordAudit } from './auditService.js';
import {
  computeReceiptCode,
  encryptVoteSecret,
  generateBallotToken,
  generateVoteSecret,
} from './anonymity.js';
import { tallyRound } from './tally.js';

// ─────────────────────────────────────────────────────────────────────────────
// Domain errors — route handlers translate these to HTTP statuses.
// ─────────────────────────────────────────────────────────────────────────────

export class VoteLogicError extends Error {
  constructor(
    public readonly code:
      | 'vote_not_found'
      | 'vote_not_in_draft'
      | 'vote_not_open'
      | 'round_not_found'
      | 'round_not_open'
      | 'not_eligible'
      | 'already_voted'
      | 'blank_not_allowed'
      | 'invalid_choice_count'
      | 'unknown_option',
  ) {
    super(code);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// openVote
// ─────────────────────────────────────────────────────────────────────────────

interface OpenVoteResult {
  voteId: string;
  roundId: string;
}

/**
 * Snapshots the eligible-voter list (frozen at this moment — later level
 * changes do not affect this vote) and flips the vote status from `draft`
 * to `open`. Round 1 is expected to already exist (created at the same time
 * as the draft so options have somewhere to attach).
 *
 * In anonymous mode, also generates the per-vote secret stored encrypted
 * in `votes.anonymous_key`. MVP does not consume it for HMAC; it is sealed
 * (nulled) at vote close as a ceremonial guarantee.
 */
export const openVote = async (voteId: string, actorId: string | null): Promise<OpenVoteResult> => {
  const result = await db.transaction(async (tx) => {
    // Serialize concurrent attempts (e.g. admin button + scheduler tick in
    // the same minute) so the eligibility snapshot can't run twice.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${voteId}))`);

    const voteRows = await tx
      .select({
        id: votes.id,
        status: votes.status,
        mode: votes.mode,
        eligibleLevels: votes.eligibleLevels,
      })
      .from(votes)
      .where(eq(votes.id, voteId))
      .limit(1);

    const vote = voteRows[0];
    if (!vote) throw new VoteLogicError('vote_not_found');
    if (vote.status !== 'draft') throw new VoteLogicError('vote_not_in_draft');

    // Snapshot eligibility — every active user whose level is in the vote set.
    const eligible = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.active, true), inArray(users.level, vote.eligibleLevels as number[])),
      );

    if (eligible.length > 0) {
      await tx.insert(eligibleVoters).values(eligible.map((u) => ({ voteId, userId: u.id })));
    }

    // Round 1 was created at the same time as the draft — locate it.
    const round = (
      await tx
        .select({ id: voteRounds.id })
        .from(voteRounds)
        .where(and(eq(voteRounds.voteId, voteId), eq(voteRounds.roundNumber, 1)))
        .limit(1)
    )[0];
    if (!round) throw new VoteLogicError('round_not_found');

    const updateData: {
      status: 'open';
      openAt: Date;
      updatedAt: Date;
      anonymousKey?: ReturnType<typeof encryptVoteSecret>;
    } = {
      status: 'open',
      openAt: new Date(),
      updatedAt: new Date(),
    };
    if (vote.mode === 'anonymous') {
      updateData.anonymousKey = encryptVoteSecret(generateVoteSecret());
    }

    await tx.update(votes).set(updateData).where(eq(votes.id, voteId));

    return { voteId, roundId: round.id, eligibleCount: eligible.length };
  });

  await recordAudit({
    entityType: 'vote',
    entityId: voteId,
    action: 'vote_opened',
    actorId,
    meta: { roundId: result.roundId, eligibleCount: result.eligibleCount },
  });
  return { voteId: result.voteId, roundId: result.roundId };
};

// ─────────────────────────────────────────────────────────────────────────────
// castBallot
// ─────────────────────────────────────────────────────────────────────────────

interface CastBallotResult {
  ok: true;
  /** Verification code the voter writes down — meaningless until close. */
  receiptCode: string;
}

/**
 * Atomically records that the voter participated AND inserts their ballot.
 * In anonymous mode the ballot row carries `ballot_token` and `user_id=NULL`;
 * in open mode the inverse. The two tables are intentionally not joined.
 *
 * Returns a receipt code (BLAKE2b over token + voteId + sorted choices) that
 * the voter notes down at cast time and can later look up in the published
 * results — without anyone else being able to attribute it to them. The link
 * voter↔token lives only in this function's stack frame.
 */
export const castBallot = async (
  voteId: string,
  roundId: string,
  user: { id: string; level: UserLevel },
  payload: BallotPayload,
): Promise<CastBallotResult> => {
  // Load vote + round + check window before opening a transaction.
  const ctxRows = await db
    .select({
      voteId: votes.id,
      mode: votes.mode,
      status: votes.status,
      allowBlank: votes.allowBlank,
      scrutinType: votes.scrutinType,
      maxChoices: votes.maxChoices,
      roundId: voteRounds.id,
      roundStatus: voteRounds.status,
      roundVoteId: voteRounds.voteId,
    })
    .from(voteRounds)
    .innerJoin(votes, eq(votes.id, voteRounds.voteId))
    .where(and(eq(voteRounds.id, roundId), eq(votes.id, voteId)))
    .limit(1);

  const ctx = ctxRows[0];
  if (!ctx) throw new VoteLogicError('round_not_found');
  if (ctx.status !== 'open') throw new VoteLogicError('vote_not_open');
  if (ctx.roundStatus !== 'open') throw new VoteLogicError('round_not_open');

  // Eligibility — frozen snapshot.
  const elig = await db
    .select({ id: eligibleVoters.id })
    .from(eligibleVoters)
    .where(and(eq(eligibleVoters.voteId, voteId), eq(eligibleVoters.userId, user.id)))
    .limit(1);
  if (elig.length === 0) throw new VoteLogicError('not_eligible');

  // Blank policy.
  if (payload.isBlank && !ctx.allowBlank) {
    throw new VoteLogicError('blank_not_allowed');
  }

  // Cardinality vs scrutin type.
  if (!payload.isBlank) {
    if (ctx.scrutinType === 'single' && payload.choices.length !== 1) {
      throw new VoteLogicError('invalid_choice_count');
    }
    if (ctx.scrutinType === 'multiple') {
      if (payload.choices.length < 1 || payload.choices.length > ctx.maxChoices) {
        throw new VoteLogicError('invalid_choice_count');
      }
    }

    // Every choice id must belong to this round's option set.
    const opts = await db
      .select({ id: voteOptions.id })
      .from(voteOptions)
      .where(eq(voteOptions.roundId, roundId));
    const known = new Set(opts.map((o) => o.id));
    for (const c of payload.choices) {
      if (!known.has(c)) throw new VoteLogicError('unknown_option');
    }
  }

  // Atomic transaction: participation + ballot. The UNIQUE(round_id, user_id)
  // constraint on participations is the only double-vote guard we need.
  let receiptSource: string;
  try {
    receiptSource = await db.transaction(async (tx) => {
      await tx.insert(participations).values({
        roundId,
        userId: user.id,
      });

      if (ctx.mode === 'anonymous') {
        const token = generateBallotToken();
        await tx.insert(ballots).values({
          roundId,
          ballotToken: token,
          userId: null,
          choices: payload.choices,
          isBlank: payload.isBlank,
          comment: payload.comment ?? null,
        });
        return token;
      }

      const inserted = await tx
        .insert(ballots)
        .values({
          roundId,
          ballotToken: null,
          userId: user.id,
          choices: payload.choices,
          isBlank: payload.isBlank,
          comment: payload.comment ?? null,
        })
        .returning({ id: ballots.id });
      return inserted[0]!.id;
    });
  } catch (err) {
    // Postgres unique violation on participations → already voted.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('participations_round_user_unique')) {
      throw new VoteLogicError('already_voted');
    }
    throw err;
  }

  // Anonymous mode: keep `actorId` out of the audit trail to avoid creating
  // a (user_id, round_id, timestamp) tuple that could be correlated with the
  // ballot row's `submitted_at`. Participations table still carries the
  // identity for quorum/relance purposes — that's the only intentional link.
  await recordAudit({
    entityType: 'ballot',
    entityId: roundId,
    action: 'ballot_cast',
    actorId: ctx.mode === 'anonymous' ? null : user.id,
    meta: { voteId, mode: ctx.mode, isBlank: payload.isBlank },
  });

  return {
    ok: true,
    receiptCode: computeReceiptCode(receiptSource, voteId, payload.choices),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// closeVoteRound — tally + majority + (optional) round 2 + key destruction
// ─────────────────────────────────────────────────────────────────────────────

interface CloseRoundResult {
  voteId: string;
  closedRoundId: string;
  nextRoundId: string | null;
  result: RoundResult;
  voteClosed: boolean;
}

/**
 * Tallies the round, persists the result, and either creates round 2 (when
 * `multi_round=true` and no majority was reached) or closes the vote and
 * destroys the per-vote anonymity secret.
 *
 * Wrapped in a transaction with an advisory lock keyed on the round id so a
 * scheduler tick and an admin click cannot both fire it at the same time.
 */
export const closeVoteRound = async (
  roundId: string,
  actorId: string | null,
): Promise<CloseRoundResult> => {
  const result = await db.transaction(async (tx) => {
    // Advisory lock — hash of round_id text, scoped to this transaction.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${roundId}))`);

    const round = (
      await tx
        .select()
        .from(voteRounds)
        .where(eq(voteRounds.id, roundId))
        .limit(1)
    )[0];
    if (!round) throw new VoteLogicError('round_not_found');
    if (round.status !== 'open') {
      // Idempotent: already closed → return the persisted result. A later
      // round may exist (multi-round case); in that case the vote is NOT
      // closed and we must surface that to callers.
      const existing = round.result as RoundResult | null;
      if (!existing) throw new VoteLogicError('round_not_open');
      const laterRound = (
        await tx
          .select({ id: voteRounds.id })
          .from(voteRounds)
          .where(
            and(
              eq(voteRounds.voteId, round.voteId),
              gt(voteRounds.roundNumber, round.roundNumber),
            ),
          )
          .limit(1)
      )[0];
      return {
        voteId: round.voteId,
        closedRoundId: round.id,
        nextRoundId: laterRound?.id ?? null,
        result: existing,
        voteClosed: !laterRound,
      };
    }

    const vote = (
      await tx.select().from(votes).where(eq(votes.id, round.voteId)).limit(1)
    )[0];
    if (!vote) throw new VoteLogicError('vote_not_found');

    // Tally — load options and ballots for this round.
    const opts = await tx
      .select({ id: voteOptions.id })
      .from(voteOptions)
      .where(eq(voteOptions.roundId, roundId));
    const ballotRows = await tx
      .select({ choices: ballots.choices, isBlank: ballots.isBlank })
      .from(ballots)
      .where(eq(ballots.roundId, roundId));
    const eligibleCount = (
      await tx
        .select({ id: eligibleVoters.id })
        .from(eligibleVoters)
        .where(eq(eligibleVoters.voteId, vote.id))
    ).length;

    const computed = tallyRound({
      optionIds: opts.map((o) => o.id),
      ballots: ballotRows.map((b) => ({
        choices: b.choices as string[],
        isBlank: b.isBlank,
      })),
      totalEligible: eligibleCount,
      quorumPct: Number(vote.quorumPct),
      majorityType: vote.majorityType as MajorityType,
      majorityBase: vote.majorityBase as MajorityBase,
    });

    // Persist round close + result.
    const closed = await tx
      .update(voteRounds)
      .set({ status: 'closed', closedAt: new Date(), result: computed })
      .where(and(eq(voteRounds.id, roundId), eq(voteRounds.status, 'open')))
      .returning({ id: voteRounds.id });
    if (closed.length === 0) {
      // Lost the race — reload and exit.
      throw new VoteLogicError('round_not_open');
    }

    // Round 2? Only if multi-round + no majority + this is round 1.
    let nextRoundId: string | null = null;
    if (vote.multiRound && !computed.majorityMet && round.roundNumber === 1) {
      const sorted = [...computed.tallies].sort((a, b) => b.count - a.count);
      const topIds = sorted.slice(0, vote.topNForRound2).map((t) => t.optionId);
      if (topIds.length >= 2) {
        const topOptions = await tx
          .select()
          .from(voteOptions)
          .where(inArray(voteOptions.id, topIds));

        const inserted = await tx
          .insert(voteRounds)
          .values({
            voteId: vote.id,
            roundNumber: 2,
            status: 'open',
            openAt: new Date(),
            // Round 2 always starts with no auto-close deadline. Copying the
            // vote's `closeAt` would re-use a timestamp that is already in
            // the past, and the scheduler would close round 2 within the
            // next minute. Admin closes it manually (or sets a new deadline).
            closeAt: null,
          })
          .returning({ id: voteRounds.id });
        nextRoundId = inserted[0]!.id;

        await tx.insert(voteOptions).values(
          topOptions.map((o, idx) => ({
            voteId: vote.id,
            roundId: nextRoundId!,
            labelFr: o.labelFr,
            labelEn: o.labelEn,
            displayOrder: idx,
          })),
        );
      }
    }

    // Close the vote and seal the anonymity secret if no further round.
    const voteClosed = nextRoundId === null;
    if (voteClosed) {
      await tx
        .update(votes)
        .set({ status: 'closed', anonymousKey: null, updatedAt: new Date() })
        .where(eq(votes.id, vote.id));
    } else {
      await tx.update(votes).set({ updatedAt: new Date() }).where(eq(votes.id, vote.id));
    }

    return {
      voteId: vote.id,
      closedRoundId: round.id,
      nextRoundId,
      result: computed,
      voteClosed,
    };
  });

  await recordAudit({
    entityType: 'round',
    entityId: result.closedRoundId,
    action: 'round_closed',
    actorId,
    meta: {
      majorityMet: result.result.majorityMet,
      quorumMet: result.result.quorumMet,
      totalBallots: result.result.totalBallots,
    },
  });
  if (result.voteClosed) {
    await recordAudit({
      entityType: 'vote',
      entityId: result.voteId,
      action: 'vote_closed',
      actorId,
    });
  } else if (result.nextRoundId) {
    await recordAudit({
      entityType: 'round',
      entityId: result.nextRoundId,
      action: 'round_created',
      actorId,
      meta: { roundNumber: 2, fromRoundId: result.closedRoundId },
    });
  }
  return result;
};
