// VoteHeader.tsx
// Slim subheader rendered inside every /vote/* page once the voter is
// authenticated. Shows the current user + a logout link, and a back link
// to the vote list. Sits BELOW the global <Header>.

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../features/vote/AuthContext';
import { logout as apiLogout } from '../../features/vote/voteApi';

export const VoteHeader = () => {
  const { t } = useTranslation();
  const { user, token, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isList = location.pathname === '/vote' || location.pathname === '/vote/';

  if (!user || !token) return null;

  const onLogout = async () => {
    // Fire-and-forget revocation, then clear local state regardless.
    void apiLogout(token);
    logout();
    navigate('/vote/login', { replace: true });
  };

  return (
    <div className="bg-hc-bg-mint border-b border-hc-green-accent/40">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          {!isList && (
            <Link
              to="/vote"
              className="inline-flex items-center gap-1 text-hc-green-pillar hover:text-hc-green-founder"
            >
              <ArrowLeft size={14} aria-hidden />
              <span>{t('vote.nav.back_to_list')}</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-hc-green-founder">
          {isAdmin && (
            <span className="hc-badge">
              <ShieldCheck size={12} aria-hidden /> {t('vote.role.admin')}
            </span>
          )}
          <span className="hidden font-bold sm:inline">{user.fullName}</span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-hc-green-pillar hover:bg-white hover:text-hc-green-founder"
          >
            <LogOut size={14} aria-hidden />
            <span>{t('vote.nav.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
