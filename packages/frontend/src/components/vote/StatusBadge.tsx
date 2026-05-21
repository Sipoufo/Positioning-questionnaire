// StatusBadge.tsx
// Pill displaying a vote / round status. Pairs a symbol with each color so
// the meaning survives grayscale (DESIGN_SYSTEM §5 anti-color-blindness).

import { useTranslation } from 'react-i18next';
import type { VoteStatus } from '@hc/shared';

interface StatusBadgeProps {
  status: VoteStatus;
}

const SYMBOL: Record<VoteStatus, string> = {
  draft: '✎',
  open: '●',
  closed: '✓',
  cancelled: '✕',
};

const STYLES: Record<VoteStatus, string> = {
  draft: 'border-hc-gray-mid bg-hc-gray-light text-hc-gray-slate',
  open: 'border-hc-green-accent bg-hc-bg-mint text-hc-green-pillar',
  closed: 'border-hc-green-founder bg-hc-green-founder text-white',
  cancelled: 'border-hc-red-alert bg-hc-red-pale text-hc-red-alert',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STYLES[status]}`}
    >
      <span aria-hidden>{SYMBOL[status]}</span>
      <span>{t(`vote.status.${status}`)}</span>
    </span>
  );
};
