// AdminVoters.tsx
// Admin voters management — list + add + edit (inline) + deactivate.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { PublicUser, UserLevel, UserRole } from '@hc/shared';
import { useAuth } from '../../../features/vote/AuthContext';
import {
  adminCreateVoter,
  adminDeactivateVoter,
  adminListVoters,
  adminUpdateVoter,
} from '../../../features/vote/voteApi';
import { VoteHeader } from '../../../components/vote/VoteHeader';
import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { inputClass } from '../../../components/ui/inputs';

interface Draft {
  email: string;
  fullName: string;
  level: UserLevel;
  role: UserRole;
}

const EMPTY: Draft = { email: '', fullName: '', level: 1, role: 'member' };

export const AdminVoters = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [voters, setVoters] = useState<PublicUser[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | undefined>();

  const reload = async () => {
    if (!token) return;
    const res = await adminListVoters(token);
    setVoters(res.ok ? res.data.voters : []);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;
    setErrorKey(undefined);
    setSubmitting(true);
    const res = await adminCreateVoter(token, draft);
    setSubmitting(false);
    if (!res.ok) {
      setErrorKey(res.message);
      return;
    }
    setDraft(EMPTY);
    await reload();
  };

  const onUpdate = async (id: string, patch: Partial<Draft>) => {
    if (!token) return;
    await adminUpdateVoter(token, id, patch);
    await reload();
  };

  const onDeactivate = async (id: string) => {
    if (!token) return;
    if (!window.confirm(t('vote.admin.voters.confirm_deactivate'))) return;
    await adminDeactivateVoter(token, id);
    await reload();
  };

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-hc-green-founder">{t('vote.admin.voters.title')}</h1>

        <form onSubmit={onCreate} className="mt-6 hc-card space-y-3">
          <h2 className="text-base font-bold text-hc-green-founder">
            {t('vote.admin.voters.add_title')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="email"
              required
              placeholder={t('vote.admin.voters.col_email')}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              required
              placeholder={t('vote.admin.voters.col_name')}
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className={inputClass}
            />
            <select
              value={draft.level}
              onChange={(e) =>
                setDraft({ ...draft, level: Number(e.target.value) as UserLevel })
              }
              className={inputClass}
            >
              <option value={1}>{t('vote.admin.voters.level_1')}</option>
              <option value={2}>{t('vote.admin.voters.level_2')}</option>
              <option value={3}>{t('vote.admin.voters.level_3')}</option>
            </select>
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
              className={inputClass}
            >
              <option value="member">{t('vote.admin.voters.role_member')}</option>
              <option value="admin">{t('vote.admin.voters.role_admin')}</option>
            </select>
          </div>
          <ErrorMessage errorKey={errorKey} />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              <Plus size={14} aria-hidden /> {t('vote.admin.voters.add_submit')}
            </Button>
          </div>
        </form>

        <h2 className="mt-8 text-lg font-bold text-hc-green-founder">
          {t('vote.admin.voters.list_title')}
        </h2>
        {voters === null && (
          <div className="mt-4 flex items-center gap-2 text-sm text-hc-gray-slate">
            <LoaderCircle className="animate-spin" size={16} aria-hidden /> {t('vote.list.loading')}
          </div>
        )}
        {voters && voters.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-md border border-hc-bg-mint bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-hc-green-founder text-white">
                <tr>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_name')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_email')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_level')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_role')}</th>
                  <th className="px-3 py-2 font-bold">{t('vote.admin.voters.col_active')}</th>
                  <th className="px-3 py-2 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v, idx) => (
                  <tr key={v.id} className={idx % 2 ? 'bg-hc-bg-mint' : 'bg-white'}>
                    <td className="px-3 py-2 font-bold text-hc-gray-text">{v.fullName}</td>
                    <td className="px-3 py-2 text-hc-gray-text">{v.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={v.level}
                        onChange={(e) =>
                          void onUpdate(v.id, { level: Number(e.target.value) as UserLevel })
                        }
                        className="rounded border border-hc-gray-mid bg-white px-1.5 py-0.5 text-sm"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={v.role}
                        onChange={(e) => void onUpdate(v.id, { role: e.target.value as UserRole })}
                        className="rounded border border-hc-gray-mid bg-white px-1.5 py-0.5 text-sm"
                      >
                        <option value="member">{t('vote.admin.voters.role_member')}</option>
                        <option value="admin">{t('vote.admin.voters.role_admin')}</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {v.active ? (
                        <span className="hc-badge">{t('vote.admin.voters.active_yes')}</span>
                      ) : (
                        <span className="hc-badge border-hc-gray-mid bg-hc-gray-light text-hc-gray-slate">
                          {t('vote.admin.voters.active_no')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {v.active && (
                        <button
                          type="button"
                          onClick={() => void onDeactivate(v.id)}
                          aria-label={t('vote.admin.voters.deactivate_aria')}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-hc-red-alert hover:bg-hc-red-pale"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      )}
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
