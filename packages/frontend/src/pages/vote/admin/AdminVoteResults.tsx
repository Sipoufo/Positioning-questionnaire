// AdminVoteResults.tsx
// Per-round results breakdown. Visible to admins regardless of the vote's
// `result_visibility` setting.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../../features/vote/AuthContext';
import { adminGetResults, type AdminResultRound } from '../../../features/vote/voteApi';
import { VoteHeader } from '../../../components/vote/VoteHeader';
import { ResultsChart } from '../../../components/vote/ResultsChart';

export const AdminVoteResults = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [rounds, setRounds] = useState<AdminResultRound[] | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const res = await adminGetResults(token, id);
      setRounds(res.ok ? res.data.rounds : []);
    })();
  }, [token, id]);

  const fr = i18n.resolvedLanguage !== 'en';

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-hc-green-founder">{t('vote.results.title')}</h1>

        {rounds === null && (
          <div className="mt-4 flex items-center gap-2 text-sm text-hc-gray-slate">
            <LoaderCircle className="animate-spin" size={16} aria-hidden /> {t('vote.list.loading')}
          </div>
        )}

        {rounds && rounds.length === 0 && (
          <div className="mt-4 hc-info-box not-italic">{t('vote.results.empty')}</div>
        )}

        {rounds &&
          rounds.map((r) => (
            <RoundResultBlock key={r.roundId} round={r} fr={fr} />
          ))}
      </div>
    </div>
  );
};

const RoundResultBlock = ({ round, fr }: { round: AdminResultRound; fr: boolean }) => {
  const { t } = useTranslation();
  const labels = useMemo(
    () => new Map(round.optionLabels.map((o) => [o.id, fr ? o.labelFr : o.labelEn])),
    [round.optionLabels, fr],
  );

  return (
    <div className="mt-6 hc-card">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-hc-green-founder">
          {t('vote.results.round_label', { number: round.roundNumber })}
        </h2>
        <span className="text-xs text-hc-gray-slate">
          {round.status === 'closed' && round.closedAt
            ? t('vote.results.closed_on', {
                value: new Date(round.closedAt).toLocaleString(fr ? 'fr-FR' : 'en-GB'),
              })
            : t('vote.results.still_open')}
        </span>
      </div>

      {!round.result ? (
        <p className="mt-3 text-sm italic text-hc-gray-slate">{t('vote.results.no_data_yet')}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-hc-gray-text">
            {t('vote.results.summary', {
              voted: round.result.totalBallots,
              total: round.result.totalEligible,
              pct: round.result.participationPct.toFixed(1),
            })}
          </p>
          <div className={round.result.majorityMet ? 'mt-3 hc-info-box not-italic' : 'mt-3 hc-alert-box not-italic'}>
            {round.result.majorityMet
              ? t('vote.results.verdict_ok', {
                  winners: round.result.winners.map((id) => labels.get(id) ?? id).join(', '),
                })
              : t('vote.results.verdict_ko')}
          </div>
          <div className="mt-4">
            <ResultsChart
              tallies={round.result.tallies}
              labels={labels}
              base={
                round.result.totalBallots > 0 ? round.result.totalBallots - round.result.blankCount : 1
              }
              blankCount={round.result.blankCount}
              winners={round.result.winners}
            />
          </div>
        </>
      )}
    </div>
  );
};
