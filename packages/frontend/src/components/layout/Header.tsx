// Header.tsx
// Brand bar with the Happy Cash mark and a language toggle. Uses the dark
// "founder" green per the sandwich rule (charte §4.4).

import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { t, i18n } = useTranslation();

  const switchLang = (lng: 'fr' | 'en') => {
    if (i18n.language !== lng) i18n.changeLanguage(lng);
  };

  return (
    <header className="bg-hc-green-founder text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold tracking-tight">{t('brand.name')}</span>
          <span className="hidden text-sm text-hc-green-soft italic sm:inline">
            · {t('brand.tagline')}
          </span>
        </div>
        <nav aria-label={t('header.lang_label')} className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => switchLang('fr')}
            className={`rounded px-2 py-1 font-bold transition ${
              i18n.resolvedLanguage === 'fr'
                ? 'bg-hc-green-accent text-white'
                : 'text-hc-green-soft hover:text-white'
            }`}
            aria-pressed={i18n.resolvedLanguage === 'fr'}
          >
            {t('header.lang_fr')}
          </button>
          <span className="text-hc-green-soft">·</span>
          <button
            type="button"
            onClick={() => switchLang('en')}
            className={`rounded px-2 py-1 font-bold transition ${
              i18n.resolvedLanguage === 'en'
                ? 'bg-hc-green-accent text-white'
                : 'text-hc-green-soft hover:text-white'
            }`}
            aria-pressed={i18n.resolvedLanguage === 'en'}
          >
            {t('header.lang_en')}
          </button>
        </nav>
      </div>
    </header>
  );
};
