// Landing.tsx
// Cover screen — the "dark slice" of the sandwich rule. Presents the preamble,
// rules and a call to action. Detects an existing draft and offers to resume.

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, ArrowRight, Play } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DRAFT_KEY } from '../features/questionnaire/useFormState';

const hasDraft = (): boolean => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { response?: Record<string, unknown> };
    return Boolean(parsed.response && Object.keys(parsed.response).length > 0);
  } catch {
    return false;
  }
};

export const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resumeAvailable = hasDraft();

  return (
    <div>
      {/* Dark hero — sandwich cover (#1B5E20). */}
      <section className="bg-hc-green-founder text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-hc-green-soft">
            {t('landing.subtitle')}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            {t('brand.tagline')}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-hc-green-pale">
            {t('landing.preamble_body')}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-hc-green-accent bg-hc-green-pillar px-4 py-2 text-sm">
            <Clock size={16} aria-hidden />
            <span>{t('landing.time_estimate')}</span>
          </div>
        </div>
      </section>

      {/* Light content slice. */}
      <section className="bg-hc-bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-xl font-bold text-hc-green-founder">{t('landing.rules_title')}</h2>
          <ul className="mt-4 space-y-3">
            {(['rule_honest', 'rule_no_judgment', 'rule_confidential', 'rule_editable'] as const).map(
              (key) => (
                <li key={key} className="hc-card text-sm leading-relaxed">
                  {t(`landing.${key}`)}
                </li>
              ),
            )}
          </ul>

          <div className="mt-6 hc-info-box not-italic">
            <strong className="block font-bold">{t('landing.deadline_label')}</strong>
            <span>{t('landing.deadline_value')}</span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/questionnaire')}>
              {resumeAvailable ? <Play size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
              {resumeAvailable ? t('landing.resume') : t('landing.start')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
