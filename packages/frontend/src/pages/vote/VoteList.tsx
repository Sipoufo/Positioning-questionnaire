// VoteList.tsx
// Member home — every vote the current user is eligible for, with a status
// pill and a "voted" indicator. Empty state when there's nothing to see.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { VoteSummary } from '@hc/shared';
import { useAuth } from '../../features/vote/AuthContext';
import { listVotes } from '../../features/vote/voteApi';
import { VoteHeader } from '../../components/vote/VoteHeader';
import { StatusBadge } from '../../components/vote/StatusBadge';

export const VoteList = () => {
  const { t, i18n } = useTranslation();
  const { token, isAdmin } = useAuth();
  const [votes, setVotes] = useState<VoteSummary[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await listVotes(token);
      if (!res.ok) {
        setErrorKey(res.message);
        setVotes([]);
        return;
      }
      setVotes(res.data.votes);
    })();
  }, [token]);

  const formatDeadline = (iso: string | null): string => {
    if (!iso) return t('vote.list.no_deadline');
    return new Date(iso).toLocaleString(i18n.resolvedLanguage === 'en' ? 'en-GB' : 'fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-hc-green-founder">{t('vote.list.title')}</h1>
          {isAdmin && (
            <Link
              to="/vote/admin"
              className="inline-flex items-center gap-1 rounded-md border border-hc-green-accent bg-white px-3 py-1.5 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint"
            >
              <ShieldCheck size={14} aria-hidden />
              {t('vote.list.go_admin')}
            </Link>
          )}
        </div>

        {votes === null && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-hc-gray-slate">
            <LoaderCircle className="animate-spin" size={18} aria-hidden />
            {t('vote.list.loading')}
          </div>
        )}

        {votes && errorKey && (
          <div className="mt-6 hc-alert-box not-italic">{t('vote.list.load_error')}</div>
        )}

        {votes && !errorKey && votes.length === 0 && (
          <div className="mt-6 hc-info-box not-italic">{t('vote.list.empty')}</div>
        )}

        {votes && votes.length > 0 && (
          <ul className="mt-6 space-y-3">
            {votes.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/vote/${v.id}`}
                  className="hc-card flex items-center justify-between gap-4 hover:bg-hc-bg-mint"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={v.status} />
                      {v.hasVoted && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-hc-green-accent bg-hc-bg-mint px-2 py-0.5 text-xs font-bold text-hc-green-pillar">
                          <CheckCircle2 size={12} aria-hidden /> {t('vote.list.voted')}
                        </span>
                      )}
                      {v.mode === 'anonymous' && (
                        <span className="hc-badge">{t('vote.list.anonymous')}</span>
                      )}
                    </div>
                    <h2 className="mt-2 truncate text-base font-bold text-hc-green-founder">
                      {v.title}
                    </h2>
                    <p className="mt-1 text-xs text-hc-gray-slate">
                      {v.status === 'open'
                        ? t('vote.list.closes_at', { value: formatDeadline(v.closeAt) })
                        : v.status === 'closed'
                          ? t('vote.list.was_closed')
                          : ''}
                    </p>
                  </div>
                  <ChevronRight className="shrink-0 text-hc-green-pillar" size={20} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
