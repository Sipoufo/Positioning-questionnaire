// VoteDetail.tsx
// Vote detail page for a member. Shows context + cast form when the vote is
// open and the user hasn't voted; shows a "thank you, recorded" state when
// they have; shows a closed banner when the round is over.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info, LoaderCircle } from 'lucide-react';
import type { BallotPayload, VoteDetail as VoteDetailType } from '@hc/shared';
import { useAuth } from '../../features/vote/AuthContext';
import { castBallot, getVote } from '../../features/vote/voteApi';
import { VoteHeader } from '../../components/vote/VoteHeader';
import { StatusBadge } from '../../components/vote/StatusBadge';
import { BallotForm } from '../../components/vote/BallotForm';

export const VoteDetail = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [vote, setVote] = useState<VoteDetailType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitErrorKey, setSubmitErrorKey] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const res = await getVote(token, id);
      if (!res.ok) {
        setLoadError(res.message);
        return;
      }
      setVote(res.data.vote);
    })();
  }, [token, id]);

  const onSubmit = async (payload: BallotPayload) => {
    if (!token || !id || !vote) return;
    setSubmitErrorKey(undefined);
    setSubmitting(true);
    const res = await castBallot(token, id, vote.currentRound.id, payload);
    setSubmitting(false);
    if (!res.ok) {
      setSubmitErrorKey(res.message);
      return;
    }
    navigate(`/vote/${id}/success`, {
      replace: true,
      state: { receiptCode: res.data.receiptCode },
    });
  };

  if (loadError) {
    return (
      <div className="bg-hc-bg-cream">
        <VoteHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="hc-alert-box not-italic">
            {t(`vote.detail.errors.${loadError}`, {
              defaultValue: t('vote.detail.errors.generic'),
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="bg-hc-bg-cream">
        <VoteHeader />
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center">
          <LoaderCircle className="animate-spin text-hc-green-pillar" size={28} aria-hidden />
          <p className="mt-3 text-sm text-hc-gray-slate">{t('vote.detail.loading')}</p>
        </div>
      </div>
    );
  }

  const formattedClose = vote.closeAt
    ? new Date(vote.closeAt).toLocaleString(i18n.resolvedLanguage === 'en' ? 'en-GB' : 'fr-FR')
    : null;

  const canCast = vote.status === 'open' && vote.currentRound.status === 'open' && !vote.hasVoted;

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={vote.status} />
          {vote.mode === 'anonymous' && <span className="hc-badge">{t('vote.list.anonymous')}</span>}
          {vote.multiRound && (
            <span className="hc-badge">
              {t('vote.detail.round', { number: vote.currentRound.roundNumber })}
            </span>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-hc-green-founder">{vote.title}</h1>
        {formattedClose && (
          <p className="mt-1 text-sm text-hc-gray-slate">
            {t('vote.detail.closes_at', { value: formattedClose })}
          </p>
        )}

        {vote.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-hc-gray-text">
            {vote.description}
          </p>
        )}

        {vote.mode === 'anonymous' && (
          <div className="mt-6 hc-info-box not-italic flex gap-3">
            <Info size={18} aria-hidden className="shrink-0 mt-0.5" />
            <span>{t('vote.detail.anonymity_disclosure')}</span>
          </div>
        )}

        <div className="mt-8">
          {vote.hasVoted && (
            <div className="hc-card flex items-start gap-3">
              <CheckCircle2 className="shrink-0 text-hc-green-pillar" size={24} aria-hidden />
              <div>
                <h2 className="text-base font-bold text-hc-green-founder">
                  {t('vote.detail.already_voted_title')}
                </h2>
                <p className="mt-1 text-sm text-hc-gray-text">
                  {t('vote.detail.already_voted_body')}
                </p>
              </div>
            </div>
          )}

          {!vote.hasVoted && vote.status === 'closed' && (
            <div className="hc-info-box not-italic">{t('vote.detail.closed_no_vote')}</div>
          )}

          {canCast && (
            <>
              <h2 className="mb-3 text-lg font-bold text-hc-green-founder">
                {t('vote.detail.cast_title')}
              </h2>
              <p className="mb-4 text-sm italic text-hc-gray-slate">
                {vote.scrutinType === 'single'
                  ? t('vote.detail.cast_help_single')
                  : t('vote.detail.cast_help_multiple', { max: vote.maxChoices })}
              </p>
              <BallotForm
                vote={vote}
                submitting={submitting}
                errorKey={submitErrorKey}
                onSubmit={onSubmit}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
