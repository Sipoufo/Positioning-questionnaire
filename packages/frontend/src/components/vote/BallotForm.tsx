// BallotForm.tsx
// Cast-a-ballot widget. Handles single (radio) and multiple (checkbox)
// scrutin types, optional blank ballot, optional comment, live counter for
// the multi-choice case, and submit gating.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import type { BallotPayload, VoteDetail } from '@hc/shared';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { textareaClass } from '../ui/inputs';

interface BallotFormProps {
  vote: VoteDetail;
  submitting: boolean;
  errorKey?: string;
  onSubmit: (payload: BallotPayload) => void;
}

export const BallotForm = ({ vote, submitting, errorKey, onSubmit }: BallotFormProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';
  const options = vote.currentRound.options;

  const [selected, setSelected] = useState<string[]>([]);
  const [isBlank, setIsBlank] = useState(false);
  const [comment, setComment] = useState('');

  const isSingle = vote.scrutinType === 'single';

  const toggle = (id: string) => {
    if (isBlank) return; // ignore choices when blank chosen
    if (isSingle) {
      setSelected([id]);
    } else {
      setSelected((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < vote.maxChoices
            ? [...prev, id]
            : prev,
      );
    }
  };

  const onBlankChange = (checked: boolean) => {
    setIsBlank(checked);
    if (checked) setSelected([]);
  };

  const validCount = useMemo(() => {
    if (isBlank) return true;
    if (isSingle) return selected.length === 1;
    return selected.length >= 1 && selected.length <= vote.maxChoices;
  }, [isBlank, isSingle, selected.length, vote.maxChoices]);

  const submit = () => {
    if (!validCount || submitting) return;
    const payload: BallotPayload = {
      choices: isBlank ? [] : selected,
      isBlank,
      comment: comment.trim() ? comment.trim() : undefined,
    };
    onSubmit(payload);
  };

  return (
    <div className="space-y-5">
      <fieldset disabled={isBlank} className="space-y-2">
        <legend className="sr-only">{t('vote.ballot.options_legend')}</legend>
        {options.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                checked
                  ? 'border-hc-green-accent bg-hc-bg-mint'
                  : 'border-hc-gray-mid bg-white hover:border-hc-green-accent'
              } ${isBlank ? 'opacity-50' : ''}`}
            >
              <input
                type={isSingle ? 'radio' : 'checkbox'}
                name="ballot-option"
                value={opt.id}
                checked={checked}
                onChange={() => toggle(opt.id)}
                className="mt-1 h-4 w-4 accent-hc-green-accent"
              />
              <span className="text-sm text-hc-gray-text">
                {locale === 'fr' ? opt.labelFr : opt.labelEn}
              </span>
            </label>
          );
        })}
      </fieldset>

      {!isSingle && (
        <p className="text-sm italic text-hc-gray-slate">
          {t('vote.ballot.counter', { count: selected.length, max: vote.maxChoices })}
        </p>
      )}

      {vote.allowBlank && (
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-hc-green-founder">
          <input
            type="checkbox"
            checked={isBlank}
            onChange={(e) => onBlankChange(e.target.checked)}
            className="h-4 w-4 accent-hc-green-accent"
          />
          {t('vote.ballot.blank')}
        </label>
      )}

      <div>
        <label htmlFor="ballot-comment" className="mb-1 block text-sm font-bold text-hc-green-founder">
          {t('vote.ballot.comment_label')}
        </label>
        <textarea
          id="ballot-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          className={textareaClass}
          placeholder={t('vote.ballot.comment_placeholder')}
        />
      </div>

      <ErrorMessage errorKey={errorKey} />

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!validCount || submitting} type="button">
          <Send size={16} aria-hidden />
          {submitting ? t('vote.ballot.submitting') : t('vote.ballot.submit')}
        </Button>
      </div>
    </div>
  );
};
