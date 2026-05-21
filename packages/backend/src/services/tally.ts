// tally.ts
// Pure tallying + majority logic. Pulled out of voteLogic.ts so the rules
// can be unit-tested in isolation. Operates on rows fetched by the caller;
// performs no DB I/O itself.

import type {
  MajorityBase,
  MajorityType,
  OptionTally,
  RoundResult,
} from '@hc/shared';

interface TallyInput {
  optionIds: string[];
  ballots: { choices: string[]; isBlank: boolean }[];
  totalEligible: number;
  quorumPct: number;
  majorityType: MajorityType;
  majorityBase: MajorityBase;
}

const THRESHOLD: Record<MajorityType, number | null> = {
  simple: null, // strictly highest count
  absolute: 50,
  qualified_2_3: 200 / 3, // 66.66…
  qualified_3_4: 75,
  unanimous: 100,
};

/**
 * Returns the full result snapshot persisted to `vote_rounds.result`.
 * Treats every choice in a multi-choice ballot as one vote for that option
 * (block-vote style — simple and predictable at this scale).
 */
export const tallyRound = (input: TallyInput): RoundResult => {
  const counts = new Map<string, number>();
  for (const id of input.optionIds) counts.set(id, 0);

  let blankCount = 0;
  for (const b of input.ballots) {
    if (b.isBlank) {
      blankCount += 1;
      continue;
    }
    for (const c of b.choices) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }

  const tallies: OptionTally[] = input.optionIds.map((id) => ({
    optionId: id,
    count: counts.get(id) ?? 0,
  }));

  const totalBallots = input.ballots.length;
  const participationPct =
    input.totalEligible > 0 ? (totalBallots / input.totalEligible) * 100 : 0;
  const quorumMet = participationPct >= input.quorumPct;

  // Determine the relevant base for majority computation.
  let base: number;
  switch (input.majorityBase) {
    case 'expressed':
      base = totalBallots - blankCount;
      break;
    case 'expressed_with_blank':
      base = totalBallots;
      break;
    case 'eligible':
      base = input.totalEligible;
      break;
  }

  let majorityMet = false;
  let winners: string[] = [];

  if (base > 0) {
    const sorted = [...tallies].sort((a, b) => b.count - a.count);
    const topCount = sorted[0]?.count ?? 0;

    if (input.majorityType === 'simple') {
      // Strictly highest count with at least 1 vote. Ties → no winner.
      if (topCount > 0 && (sorted[1]?.count ?? -1) < topCount) {
        majorityMet = true;
        winners = [sorted[0]!.optionId];
      }
    } else {
      const threshold = THRESHOLD[input.majorityType]!;
      const topPct = (topCount / base) * 100;
      // Strict comparison for absolute/qualified ("plus de"), inclusive
      // for unanimous (100% of base).
      const passes =
        input.majorityType === 'unanimous' ? topPct >= threshold : topPct > threshold;
      if (passes && (sorted[1]?.count ?? -1) < topCount) {
        majorityMet = true;
        winners = [sorted[0]!.optionId];
      }
    }
  }

  return {
    tallies,
    blankCount,
    totalBallots,
    totalEligible: input.totalEligible,
    participationPct: Math.round(participationPct * 100) / 100,
    quorumMet,
    majorityMet: majorityMet && quorumMet,
    winners: majorityMet && quorumMet ? winners : [],
  };
};
