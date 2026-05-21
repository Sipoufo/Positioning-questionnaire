// VoteVerify.tsx
// Magic-link callback. Reads ?token=... from the URL, exchanges it for a
// session via the API, then redirects to /vote (or wherever the user was
// trying to reach before being bounced to /vote/login).

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../features/vote/AuthContext';
import { verifyMagicLink } from '../../features/vote/voteApi';

type Phase = 'verifying' | 'error';

export const VoteVerify = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [errorKey, setErrorKey] = useState<string>('invalid_token');
  // React 18 StrictMode double-invokes effects in dev. Guard against
  // posting the verify request twice (the second call would 401 with
  // token_used and overwrite a successful login).
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    const token = params.get('token') ?? '';
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      setErrorKey('invalid_token');
      setPhase('error');
      return;
    }
    void (async () => {
      const res = await verifyMagicLink({ token });
      if (!res.ok) {
        setErrorKey(res.message);
        setPhase('error');
        return;
      }
      login({
        token: res.data.sessionToken,
        expiresAt: res.data.expiresAt,
        user: res.data.user,
      });
      navigate('/vote', { replace: true });
    })();
  }, [params, login, navigate]);

  if (phase === 'verifying') {
    return (
      <div className="bg-hc-bg-cream">
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
          <LoaderCircle className="animate-spin text-hc-green-pillar" size={32} aria-hidden />
          <p className="mt-4 text-sm text-hc-gray-text">{t('vote.verify.in_progress')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hc-bg-cream">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="hc-alert-box not-italic">
          <strong className="block">{t('vote.verify.error_title')}</strong>
          <span className="mt-1 block font-normal">
            {t(`vote.verify.errors.${errorKey}`, {
              defaultValue: t('vote.verify.errors.invalid_token'),
            })}
          </span>
        </div>
        <Link
          to="/vote/login"
          className="mt-6 inline-block text-sm font-bold text-hc-green-pillar hover:text-hc-green-founder"
        >
          {t('vote.verify.back_to_login')} →
        </Link>
      </div>
    </div>
  );
};
