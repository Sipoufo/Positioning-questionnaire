// Footer.tsx
// Dark closing bar — the bottom slice of the sandwich (charte §4.4).

import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-hc-green-founder text-hc-green-pale">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 px-4 py-4 text-xs sm:flex-row sm:justify-between">
        <span>{t('footer.confidential')}</span>
        <span>{t('footer.version')}</span>
      </div>
    </footer>
  );
};
