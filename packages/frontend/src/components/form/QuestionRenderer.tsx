// QuestionRenderer.tsx
// Dispatches a question config to the matching UI control. Handles every type
// declared in the shared schema: text/tel/email/textarea, radio, checkbox,
// scale and consent. Also wires the optional `:precise` free-text companion.

import { useTranslation } from 'react-i18next';
import type { ChangeEvent } from 'react';
import type { Answer, Locale, Question, QuestionOption } from '@hc/shared';
import { FieldLabel } from '../ui/FieldLabel';
import { ErrorMessage } from '../ui/ErrorMessage';
import { inputClass, textareaClass } from '../ui/inputs';

interface QuestionRendererProps {
  question: Question;
  value: Answer | undefined;
  preciseValue: string | undefined;
  errorKey: string | undefined;
  required: boolean;
  onChange: (id: string, value: Answer) => void;
  onChangePrecise: (id: string, value: string) => void;
}

const labelOf = (option: QuestionOption, lang: Locale) => option.label[lang];

export const QuestionRenderer = ({
  question,
  value,
  preciseValue,
  errorKey,
  required,
  onChange,
  onChangePrecise,
}: QuestionRendererProps) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as Locale) === 'en' ? 'en' : 'fr';

  const inputId = `field-${question.id}`;
  const helper = question.helper ? question.helper[lang] : undefined;
  const labelText = question.label[lang];

  const handleText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(question.id, e.target.value);
  };

  const handleRadio = (val: string) => {
    onChange(question.id, val);
    // Clear stale precise text if the new option doesn't expect one.
    const opt = (question.type === 'radio' || question.type === 'scale'
      ? question.options
      : []
    ).find((o) => o.value === val);
    if (!opt?.withPrecision) onChangePrecise(question.id, '');
  };

  const handleCheckbox = (val: string, checked: boolean) => {
    const current = Array.isArray(value) ? value : [];
    const next = checked ? [...current, val] : current.filter((v) => v !== val);
    onChange(question.id, next);
  };

  const renderPrecise = (optionValue: string) => {
    const allOptions = 'options' in question ? question.options : [];
    const opt = allOptions.find((o) => o.value === optionValue);
    if (!opt?.withPrecision) return null;
    const isSelected =
      question.type === 'checkbox'
        ? Array.isArray(value) && value.includes(optionValue)
        : value === optionValue;
    if (!isSelected) return null;
    return (
      <div className="mt-2 ml-7">
        <input
          type="text"
          className={inputClass}
          value={preciseValue ?? ''}
          onChange={(e) => onChangePrecise(question.id, e.target.value)}
          placeholder={t('step.precise_placeholder')}
          aria-label={t('step.precise_placeholder')}
          maxLength={300}
        />
      </div>
    );
  };

  switch (question.type) {
    case 'text':
    case 'tel':
    case 'email': {
      const inputType = question.type === 'text' ? 'text' : question.type;
      return (
        <div>
          <FieldLabel htmlFor={inputId} label={labelText} helper={helper} required={required} />
          <input
            id={inputId}
            type={inputType}
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            onChange={handleText}
            placeholder={question.placeholder?.[lang]}
            maxLength={question.maxLength}
            aria-invalid={Boolean(errorKey)}
          />
          <ErrorMessage errorKey={errorKey} />
        </div>
      );
    }

    case 'textarea': {
      const v = typeof value === 'string' ? value : '';
      return (
        <div>
          <FieldLabel htmlFor={inputId} label={labelText} helper={helper} required={required} />
          <textarea
            id={inputId}
            className={textareaClass}
            value={v}
            onChange={handleText}
            placeholder={question.placeholder?.[lang]}
            maxLength={question.maxLength}
            aria-invalid={Boolean(errorKey)}
          />
          {question.maxLength ? (
            <p className="mt-1 text-right text-xs text-hc-gray-slate">
              {v.length} / {question.maxLength}
            </p>
          ) : null}
          <ErrorMessage errorKey={errorKey} />
        </div>
      );
    }

    case 'radio':
    case 'scale': {
      return (
        <fieldset>
          <FieldLabel label={labelText} helper={helper} required={required} />
          <div
            className={`space-y-2 rounded-md ${
              errorKey ? 'border-2 border-hc-red-alert bg-hc-red-pale/30 p-2' : ''
            }`}
            role="radiogroup"
            aria-invalid={Boolean(errorKey)}
          >
            {question.options.map((opt) => {
              const checked = value === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    checked
                      ? 'border-hc-green-accent bg-hc-bg-mint'
                      : 'border-hc-gray-mid bg-white hover:bg-hc-bg-mint/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={opt.value}
                    checked={checked}
                    onChange={() => handleRadio(opt.value)}
                    className="mt-1 h-4 w-4 accent-hc-green-accent"
                  />
                  <span className="text-sm leading-snug">{labelOf(opt, lang)}</span>
                </label>
              );
            })}
          </div>
          {/* Render precise input for the selected option only */}
          {typeof value === 'string' ? renderPrecise(value) : null}
          <ErrorMessage errorKey={errorKey} />
        </fieldset>
      );
    }

    case 'checkbox':
    case 'consent': {
      const arr = Array.isArray(value) ? value : [];
      const isConsent = question.type === 'consent';
      const max = question.type === 'checkbox' ? question.maxSelected : undefined;
      return (
        <fieldset>
          <FieldLabel label={labelText} helper={helper} required={required} />
          {max ? (
            <p className="mb-2 text-xs italic text-hc-gray-slate">
              {t('step.max_select', { count: max })}
            </p>
          ) : null}
          <div
            className={`space-y-2 rounded-md ${
              errorKey ? 'border-2 border-hc-red-alert bg-hc-red-pale/30 p-2' : ''
            }`}
            aria-invalid={Boolean(errorKey)}
          >
            {question.options.map((opt) => {
              const checked = arr.includes(opt.value);
              return (
                <div key={opt.value}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                      checked
                        ? 'border-hc-green-accent bg-hc-bg-mint'
                        : 'border-hc-gray-mid bg-white hover:bg-hc-bg-mint/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={question.id}
                      value={opt.value}
                      checked={checked}
                      onChange={(e) => handleCheckbox(opt.value, e.target.checked)}
                      className="mt-1 h-4 w-4 accent-hc-green-accent"
                    />
                    <span className={`text-sm leading-snug ${isConsent ? 'font-medium' : ''}`}>
                      {labelOf(opt, lang)}
                    </span>
                  </label>
                  {renderPrecise(opt.value)}
                </div>
              );
            })}
          </div>
          <ErrorMessage errorKey={errorKey} />
        </fieldset>
      );
    }
  }
};
