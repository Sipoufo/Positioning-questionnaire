// VoteLogin.tsx
// Magic-link request screen — the entry point of the vote module for any
// member. The API always responds 200 (no email enumeration) so the UI just
// confirms "if this address is registered, an email is on its way".

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { inputClass } from '../../components/ui/inputs';
import { requestMagicLink } from '../../features/vote/voteApi';

export const VoteLogin = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorKey, setErrorKey] = useState<string | undefined>(undefined);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorKey(undefined);
    setSubmitting(true);
    const res = await requestMagicLink({ email: email.trim().toLowerCase() });
    setSubmitting(false);
    if (!res.ok) {
      setErrorKey(res.status === 429 ? 'too_many_requests' : 'submit_failed');
      return;
    }
    setSent(true);
  };

  return (
    <div className="bg-hc-bg-cream">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold text-hc-green-founder">{t('vote.login.title')}</h1>
        <p className="mt-2 text-sm text-hc-gray-text">{t('vote.login.subtitle')}</p>

        {sent ? (
          <div className="mt-6 hc-info-box not-italic">
            <strong className="block">{t('vote.login.sent_title')}</strong>
            <span className="mt-1 block">{t('vote.login.sent_body')}</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="vote-email" className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.login.email_label')}
              </label>
              <input
                id="vote-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="prenom.nom@example.com"
              />
            </div>
            <ErrorMessage errorKey={errorKey} />
            <Button type="submit" disabled={submitting || email.trim().length < 5}>
              <Mail size={16} aria-hidden />
              {submitting ? t('vote.login.sending') : t('vote.login.submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
