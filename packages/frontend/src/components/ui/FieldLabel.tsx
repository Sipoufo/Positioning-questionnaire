// FieldLabel.tsx
// Standard label + required/optional badge + optional helper text.

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface FieldLabelProps {
  htmlFor?: string;
  label: ReactNode;
  helper?: ReactNode;
  required: boolean;
}

export const FieldLabel = ({ htmlFor, label, helper, required }: FieldLabelProps) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2">
      <label
        htmlFor={htmlFor}
        className="flex flex-wrap items-baseline gap-2 text-base font-bold text-hc-green-founder"
      >
        <span>{label}</span>
        <span
          className={`hc-badge ${required ? '' : 'border-hc-gray-mid text-hc-gray-slate bg-hc-gray-light'}`}
        >
          {required ? t('step.required') : t('step.optional')}
        </span>
      </label>
      {helper ? <p className="mt-1 text-sm italic text-hc-gray-slate">{helper}</p> : null}
    </div>
  );
};
