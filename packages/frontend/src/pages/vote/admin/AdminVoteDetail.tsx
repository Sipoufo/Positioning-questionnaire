// AdminVoteDetail.tsx
// Live participation monitor + admin actions (open, close, remind a voter).

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, LoaderCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../features/vote/AuthContext';
import {
  adminCloseVote,
  adminGetParticipation,
  adminGetVote,
  adminOpenVote,
  adminRemind,
  type AdminVoteRow,
  type ParticipationRow,
} from '../../../features/vote/voteApi';
import { VoteHeader } from '../../../components/vote/VoteHeader';
import { StatusBadge } from '../../../components/vote/StatusBadge';
import { Button } from '../../../components/ui/Button';

export const AdminVoteDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [vote, setVote] = useState<AdminVoteRow | null>(null);
  const [participation, setParticipation] = useState<{
    totalEligible: number;
    totalVoted: number;
    voters: ParticipationRow[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    if (!token || !id) return;
    const [v, p] = await Promise.all([adminGetVote(token, id), adminGetParticipation(token, id)]);
    if (v.ok) setVote(v.data.vote);
    if (p.ok) {
      setParticipation({
        totalEligible: p.data.totalEligible,
        totalVoted: p.data.totalVoted,
        voters: p.data.voters,
      });
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const onOpen = async () => {
    if (!token || !id) return;
    setBusy(true);
    const res = await adminOpenVote(token, id);
    setBusy(false);
    setMessage(res.ok ? t('vote.admin.detail.opened_ok') : t(`errors.${res.message}`, { defaultValue: res.message }));
    await reload();
  };

  const onClose = async () => {
    if (!token || !id) return;
    if (!window.confirm(t('vote.admin.detail.confirm_close'))) return;
    setBusy(true);
    const res = await adminCloseVote(token, id);
    setBusy(false);
    setMessage(res.ok ? t('vote.admin.detail.closed_ok') : t(`errors.${res.message}`, { defaultValue: res.message }));
    await reload();
  };

  const onRemind = async (userId: string) => {
    if (!token || !id) return;
    const res = await adminRemind(token, id, userId);
    setMessage(res.ok ? t('vote.admin.detail.remind_ok') : t(`errors.${res.message}`, { defaultValue: res.message }));
  };

  if (!vote) {
    return (
      <div className="bg-hc-bg-cream">
        <VoteHeader />
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-12 text-sm text-hc-gray-slate">
          <LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden />
          {t('vote.detail.loading')}
        </div>
      </div>
    );
  }

  const pct = participation
    ? Math.round((participation.totalVoted / Math.max(participation.totalEligible, 1)) * 1000) / 10
    : 0;

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={vote.status} />
          <Link
            to={`/vote/admin/votes/${id}/results`}
            className="ml-auto text-sm font-bold text-hc-green-pillar hover:text-hc-green-founder hover:underline"
          >
            {t('vote.admin.detail.see_results')} →
          </Link>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-hc-green-founder">{vote.title}</h1>

        {/* Admin actions */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {vote.status === 'draft' && (
            <Button onClick={onOpen} disabled={busy}>
              {t('vote.admin.detail.open_vote')}
            </Button>
          )}
          {vote.status === 'open' && (
            <Button onClick={onClose} disabled={busy} variant="secondary">
              {t('vote.admin.detail.close_vote')}
            </Button>
          )}
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1 rounded-md border border-hc-green-accent bg-white px-3 py-1.5 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint"
          >
            <RefreshCw size={14} aria-hidden /> {t('vote.admin.detail.refresh')}
          </button>
        </div>

        {message && (
          <div className="mt-4 hc-info-box not-italic">{message}</div>
        )}

        {/* Participation */}
        {participation && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-hc-green-founder">
              {t('vote.admin.detail.participation_title')}
            </h2>
            <p className="mt-1 text-sm text-hc-gray-text">
              {t('vote.admin.detail.participation_count', {
                voted: participation.totalVoted,
                total: participation.totalEligible,
                pct: pct.toFixed(1),
              })}
            </p>

            <div className="mt-4 overflow-hidden rounded-md border border-hc-bg-mint bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-hc-green-founder text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_name')}</th>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_email')}</th>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.detail.col_status')}</th>
                    <th className="px-3 py-2 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {participation.voters.map((v, idx) => (
                    <tr key={v.userId} className={idx % 2 ? 'bg-hc-bg-mint' : 'bg-white'}>
                      <td className="px-3 py-2 font-bold text-hc-gray-text">{v.fullName}</td>
                      <td className="px-3 py-2 text-hc-gray-text">{v.email}</td>
                      <td className="px-3 py-2">
                        {v.hasVoted ? (
                          <span className="hc-badge">{t('vote.admin.detail.has_voted')}</span>
                        ) : (
                          <span className="hc-badge border-hc-gray-mid bg-hc-gray-light text-hc-gray-slate">
                            {t('vote.admin.detail.not_voted')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!v.hasVoted && vote.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => void onRemind(v.userId)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-hc-green-pillar hover:bg-hc-bg-mint"
                            aria-label={t('vote.admin.detail.remind_aria')}
                          >
                            <BellRing size={14} aria-hidden />
                            <span>{t('vote.admin.detail.remind')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
