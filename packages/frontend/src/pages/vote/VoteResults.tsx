// VoteResults.tsx
// Member-facing results page. Same layout as the admin version but with
// proper gating (the API enforces it — here we just translate the errors).

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../features/vote/AuthContext';
import { getResults, type MemberResultRound } from '../../features/vote/voteApi';
import { VoteHeader } from '../../components/vote/VoteHeader';
import { ResultsChart } from '../../components/vote/ResultsChart';

export const VoteResults = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [rounds, setRounds] = useState<MemberResultRound[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const fr = i18n.resolvedLanguage !== 'en';

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const res = await getResults(token, id);
      if (!res.ok) {
        setErrorKey(res.message);
        setRounds([]);
        return;
      }
      setRounds(res.data.rounds);
    })();
  }, [token, id]);

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

        {errorKey && (
          <div className="mt-4 hc-info-box not-italic">
            {t(`vote.results.errors.${errorKey}`, {
              defaultValue: t('vote.results.errors.generic'),
            })}
          </div>
        )}

        {rounds &&
          rounds.map((r) => {
            const labels = new Map(r.options.map((o) => [o.id, fr ? o.labelFr : o.labelEn]));
            return (
              <div key={r.roundId} className="mt-6 hc-card">
                <h2 className="text-base font-bold text-hc-green-founder">
                  {t('vote.results.round_label', { number: r.roundNumber })}
                </h2>
                {!r.result ? (
                  <p className="mt-2 text-sm italic text-hc-gray-slate">
                    {t('vote.results.no_data_yet')}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-hc-gray-text">
                      {t('vote.results.summary', {
                        voted: r.result.totalBallots,
                        total: r.result.totalEligible,
                        pct: r.result.participationPct.toFixed(1),
                      })}
                    </p>
                    <div
                      className={
                        r.result.majorityMet
                          ? 'mt-3 hc-info-box not-italic'
                          : 'mt-3 hc-alert-box not-italic'
                      }
                    >
                      {r.result.majorityMet
                        ? t('vote.results.verdict_ok', {
                            winners: r.result.winners.map((id) => labels.get(id) ?? id).join(', '),
                          })
                        : t('vote.results.verdict_ko')}
                    </div>
                    <div className="mt-4">
                      <ResultsChart
                        tallies={r.result.tallies}
                        labels={labels}
                        base={
                          r.result.totalBallots > 0
                            ? r.result.totalBallots - r.result.blankCount
                            : 1
                        }
                        blankCount={r.result.blankCount}
                        winners={r.result.winners}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
