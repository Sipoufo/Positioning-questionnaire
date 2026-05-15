// Success.tsx
// Closing slice of the sandwich — dark background, confirmation message, link
// to restart from a clean state.

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Success = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="bg-hc-green-founder text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
        <CheckCircle2 size={64} className="text-hc-green-soft" aria-hidden />
        <h1 className="mt-6 text-3xl font-bold">{t('success.title')}</h1>
        <p className="mt-2 text-hc-green-pale">{t('success.subtitle')}</p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-hc-green-pale">
          {t('success.body')}
        </p>
        <div className="mt-8">
          <Button variant="secondary" onClick={() => navigate('/')}>
            {t('success.restart')}
          </Button>
        </div>
      </div>
    </section>
  );
};
