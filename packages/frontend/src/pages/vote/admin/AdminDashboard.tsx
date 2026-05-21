// AdminDashboard.tsx
// Admin home — recent votes (any status) + quick links.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Plus, Users, Vote as VoteIcon } from 'lucide-react';
import { useAuth } from '../../../features/vote/AuthContext';
import { adminListVotes, type AdminVoteRow } from '../../../features/vote/voteApi';
import { VoteHeader } from '../../../components/vote/VoteHeader';
import { StatusBadge } from '../../../components/vote/StatusBadge';

export const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [votes, setVotes] = useState<AdminVoteRow[] | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await adminListVotes(token);
      setVotes(res.ok ? res.data.votes : []);
    })();
  }, [token]);

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(i18n.resolvedLanguage === 'en' ? 'en-GB' : 'fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-hc-green-founder">{t('vote.admin.dashboard.title')}</h1>
          <div className="flex gap-2">
            <Link
              to="/vote/admin/voters"
              className="inline-flex items-center gap-1 rounded-md border border-hc-green-accent bg-white px-3 py-1.5 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint"
            >
              <Users size={14} aria-hidden /> {t('vote.admin.dashboard.voters_link')}
            </Link>
            <Link
              to="/vote/admin/audit"
              className="inline-flex items-center gap-1 rounded-md border border-hc-green-accent bg-white px-3 py-1.5 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint"
            >
              {t('vote.admin.dashboard.audit_link')}
            </Link>
            <Link
              to="/vote/admin/votes/new"
              className="inline-flex items-center gap-1 rounded-md bg-hc-green-founder px-3 py-1.5 text-sm font-bold text-white hover:bg-hc-green-pillar"
            >
              <Plus size={14} aria-hidden /> {t('vote.admin.dashboard.create_vote')}
            </Link>
          </div>
        </div>

        <h2 className="mt-8 text-lg font-bold text-hc-green-founder">
          {t('vote.admin.dashboard.recent_votes')}
        </h2>
        {votes === null && (
          <div className="mt-4 flex items-center gap-2 text-sm text-hc-gray-slate">
            <LoaderCircle className="animate-spin" size={16} aria-hidden /> {t('vote.list.loading')}
          </div>
        )}
        {votes && votes.length === 0 && (
          <div className="mt-4 hc-info-box not-italic">{t('vote.admin.dashboard.empty')}</div>
        )}
        {votes && votes.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-md border border-hc-bg-mint bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-hc-green-founder text-white">
                <tr>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.dashboard.col_title')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.dashboard.col_status')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.dashboard.col_close_at')}</th>
                  <th className="px-3 py-2 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v, idx) => (
                  <tr key={v.id} className={idx % 2 ? 'bg-hc-bg-mint' : 'bg-white'}>
                    <td className="px-3 py-2 text-hc-gray-text">
                      <div className="flex items-center gap-2">
                        <VoteIcon size={14} className="shrink-0 text-hc-green-pillar" aria-hidden />
                        <span className="truncate font-bold">{v.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-3 py-2 text-hc-gray-slate">{formatDate(v.closeAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/vote/admin/votes/${v.id}`}
                        className="text-hc-green-pillar hover:text-hc-green-founder hover:underline"
                      >
                        {t('vote.admin.dashboard.open_link')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
