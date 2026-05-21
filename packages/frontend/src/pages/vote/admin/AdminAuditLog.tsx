// AdminAuditLog.tsx
// Tail of the audit trail. No filters in MVP — just the most-recent 200
// entries with a "load older" button when more exist.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../../features/vote/AuthContext';
import { adminGetAuditLog, type AuditEntry } from '../../../features/vote/voteApi';
import { VoteHeader } from '../../../components/vote/VoteHeader';

export const AdminAuditLog = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (before?: string) => {
    if (!token) return;
    setBusy(true);
    const res = await adminGetAuditLog(token, { limit: 200, before });
    setBusy(false);
    if (!res.ok) {
      setEntries([]);
      return;
    }
    setEntries((prev) => (before && prev ? [...prev, ...res.data.entries] : res.data.entries));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(i18n.resolvedLanguage === 'en' ? 'en-GB' : 'fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-hc-green-founder">
          {t('vote.admin.audit.title')}
        </h1>
        <p className="mt-1 text-sm text-hc-gray-slate">{t('vote.admin.audit.subtitle')}</p>

        {entries === null && (
          <div className="mt-4 flex items-center gap-2 text-sm text-hc-gray-slate">
            <LoaderCircle className="animate-spin" size={16} aria-hidden /> {t('vote.list.loading')}
          </div>
        )}

        {entries && entries.length === 0 && (
          <div className="mt-4 hc-info-box not-italic">{t('vote.admin.audit.empty')}</div>
        )}

        {entries && entries.length > 0 && (
          <>
            <div className="mt-4 overflow-hidden rounded-md border border-hc-bg-mint bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-hc-green-founder text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.audit.col_when')}</th>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.audit.col_action')}</th>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.audit.col_entity')}</th>
                    <th className="px-3 py-2 font-bold">{t('vote.admin.audit.col_actor')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={e.id} className={idx % 2 ? 'bg-hc-bg-mint' : 'bg-white'}>
                      <td className="px-3 py-2 text-hc-gray-slate">{fmt(e.createdAt)}</td>
                      <td className="px-3 py-2 font-bold text-hc-gray-text">
                        <code className="font-mono">{e.action}</code>
                      </td>
                      <td className="px-3 py-2 text-hc-gray-slate">
                        {e.entityType} · {e.entityId.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 text-hc-gray-text">
                        {e.actorName ? (
                          <span title={e.actorEmail ?? undefined}>{e.actorName}</span>
                        ) : (
                          <span className="italic text-hc-gray-slate">
                            {t('vote.admin.audit.system_actor')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void load(entries[entries.length - 1]?.createdAt)}
                disabled={busy}
                className="rounded-md border border-hc-green-accent bg-white px-3 py-1.5 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint disabled:opacity-50"
              >
                {busy ? t('vote.list.loading') : t('vote.admin.audit.load_older')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
