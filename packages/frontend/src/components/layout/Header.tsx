// Header.tsx
// Brand bar with the Happy Cash mark, a section nav (questionnaire / vote)
// and a language toggle. Uses the dark "founder" green per the sandwich rule
// (charte §4.4).

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { t, i18n } = useTranslation();

  const switchLang = (lng: 'fr' | 'en') => {
    if (i18n.language !== lng) i18n.changeLanguage(lng);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `rounded px-3 py-1.5 text-sm font-bold transition ${
      isActive
        ? 'bg-hc-green-accent text-white'
        : 'text-hc-green-soft hover:text-white'
    }`;

  return (
    <header className="bg-hc-green-founder text-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-baseline gap-3">
          <NavLink to="/" className="text-xl font-bold tracking-tight hover:text-hc-green-soft">
            {t('brand.name')}
          </NavLink>
          <span className="hidden text-sm text-hc-green-soft italic sm:inline">
            · {t('brand.tagline')}
          </span>
        </div>
        <nav aria-label={t('header.nav_label')} className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            {t('header.nav_questionnaire')}
          </NavLink>
          <NavLink to="/vote" className={navLinkClass}>
            {t('header.nav_vote')}
          </NavLink>
        </nav>
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
