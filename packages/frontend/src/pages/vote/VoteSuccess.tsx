// VoteSuccess.tsx
// Confirmation screen shown after a ballot was successfully recorded. Says
// nothing about the choice itself — in anonymous mode revealing it would
// defeat the dissociation. Displays the verification receipt code so the
// voter can write it down and later confirm their ballot was counted.

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Copy } from 'lucide-react';
import { VoteHeader } from '../../components/vote/VoteHeader';

interface LocationState {
  receiptCode?: string;
}

export const VoteSuccess = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!state.receiptCode) return;
    try {
      await navigator.clipboard.writeText(state.receiptCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto text-hc-green-pillar" size={56} aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-hc-green-founder">
          {t('vote.success.title')}
        </h1>
        <p className="mt-3 text-sm text-hc-gray-text">{t('vote.success.body')}</p>

        {state.receiptCode && (
          <div className="mt-6 hc-card text-left">
            <h2 className="text-sm font-bold text-hc-green-founder">
              {t('vote.success.receipt_title')}
            </h2>
            <p className="mt-1 text-xs italic text-hc-gray-slate">
              {t('vote.success.receipt_help')}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-hc-green-accent bg-hc-bg-mint px-3 py-2">
              <code className="font-mono text-base font-bold tracking-wider text-hc-green-founder">
                {state.receiptCode}
              </code>
              <button
                type="button"
                onClick={() => void onCopy()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-hc-green-pillar hover:bg-white"
              >
                <Copy size={12} aria-hidden />
                {copied ? t('vote.success.copied') : t('vote.success.copy')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {id && (
            <Link
              to={`/vote/${id}`}
              className="rounded-md border border-hc-green-accent bg-white px-4 py-2 text-sm font-bold text-hc-green-pillar hover:bg-hc-bg-mint"
            >
              {t('vote.success.back_to_vote')}
            </Link>
          )}
          <Link
            to="/vote"
            className="rounded-md bg-hc-green-founder px-4 py-2 text-sm font-bold text-white hover:bg-hc-green-pillar"
          >
            {t('vote.success.back_to_list')}
          </Link>
        </div>
      </div>
    </div>
  );
};
