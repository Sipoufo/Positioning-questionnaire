// ResultsChart.tsx
// Horizontal-bar tally chart built from Tailwind utilities — no chart library.
// Each row shows option label + raw count + percentage of the chosen base.

import { useTranslation } from 'react-i18next';
import type { OptionTally } from '@hc/shared';

interface ResultsChartProps {
  tallies: OptionTally[];
  labels: Map<string, string>;
  base: number;
  blankCount?: number;
  winners?: string[];
}

export const ResultsChart = ({ tallies, labels, base, blankCount, winners }: ResultsChartProps) => {
  const { t } = useTranslation();
  const sorted = [...tallies].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((s) => s.count), 1);
  const winnerSet = new Set(winners ?? []);

  return (
    <div className="space-y-3">
      {sorted.map((row) => {
        const label = labels.get(row.optionId) ?? row.optionId;
        const widthPct = (row.count / max) * 100;
        const sharePct = base > 0 ? (row.count / base) * 100 : 0;
        const isWinner = winnerSet.has(row.optionId);
        return (
          <div key={row.optionId}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={`truncate font-bold ${isWinner ? 'text-hc-green-founder' : 'text-hc-gray-text'}`}>
                {isWinner ? '★ ' : ''}
                {label}
              </span>
              <span className="shrink-0 text-xs text-hc-gray-slate">
                {row.count} · {sharePct.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded bg-hc-gray-light">
              <div
                className={isWinner ? 'h-full bg-hc-green-pillar' : 'h-full bg-hc-green-accent'}
                style={{ width: `${Math.max(widthPct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
      {typeof blankCount === 'number' && blankCount > 0 && (
        <p className="text-xs italic text-hc-gray-slate">
          {t('vote.results.blank_count', { count: blankCount })}
        </p>
      )}
    </div>
  );
};
