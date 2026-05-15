// ProgressBar.tsx
// Slim accent bar showing step completion. Pure visual cue — also exposes the
// numeric ratio for screen readers and color-blind users (anti-daltonism rule).

import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
  current: number; // 1-based
  total: number;
}

export const ProgressBar = ({ current, total }: ProgressBarProps) => {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs font-bold text-hc-gray-slate">
        <span>
          {t('step.section')} {current} {t('step.of')} {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={t('step.progress')}
        className="h-1.5 w-full overflow-hidden rounded-full bg-hc-gray-light"
      >
        <div
          className="h-full bg-hc-green-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
