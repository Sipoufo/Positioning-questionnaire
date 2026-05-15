// ErrorMessage.tsx
// Inline validation error using the red functional palette (charte §2.3).

import { useTranslation } from 'react-i18next';

interface ErrorMessageProps {
  errorKey: string | undefined;
}

export const ErrorMessage = ({ errorKey }: ErrorMessageProps) => {
  const { t } = useTranslation();
  if (!errorKey) return null;
  // Fallback to the raw key if no translation exists, instead of swallowing it.
  const msg = t(`errors.${errorKey}`, { defaultValue: errorKey });
  return (
    <p
      role="alert"
      className="mt-2 inline-flex items-center gap-2 rounded-md border border-hc-red-alert bg-hc-red-pale px-3 py-1.5 text-sm font-bold text-hc-red-alert"
    >
      <span aria-hidden className="text-base leading-none">✕</span>
      <span>{msg}</span>
    </p>
  );
};
