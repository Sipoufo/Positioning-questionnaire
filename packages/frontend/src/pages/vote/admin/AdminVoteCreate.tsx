// AdminVoteCreate.tsx
// Long form to create a vote in draft status. Server-side Zod re-validates
// everything; here we map field errors back onto the inputs and rely on the
// shared schema's `superRefine` to catch invariants like "single → max_choices=1".

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CreateVotePayload,
  MajorityBase,
  MajorityType,
  ResultVisibility,
  ScrutinType,
  UserLevel,
  VoteMode,
} from '@hc/shared';
import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { inputClass, textareaClass } from '../../../components/ui/inputs';
import { VoteHeader } from '../../../components/vote/VoteHeader';
import { useAuth } from '../../../features/vote/AuthContext';
import { adminCreateVote, adminOpenVote } from '../../../features/vote/voteApi';

interface OptionDraft {
  labelFr: string;
  labelEn: string;
}

export const AdminVoteCreate = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<VoteMode>('anonymous');
  const [scrutinType, setScrutinType] = useState<ScrutinType>('single');
  const [maxChoices, setMaxChoices] = useState(1);
  const [allowBlank, setAllowBlank] = useState(true);
  const [eligibleLevels, setEligibleLevels] = useState<UserLevel[]>([1]);
  const [quorumPct, setQuorumPct] = useState(0);
  const [majorityType, setMajorityType] = useState<MajorityType>('absolute');
  const [majorityBase, setMajorityBase] = useState<MajorityBase>('expressed');
  const [resultVisibility, setResultVisibility] = useState<ResultVisibility>('on_close');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [multiRound, setMultiRound] = useState(false);
  const [topN, setTopN] = useState(2);
  const [options, setOptions] = useState<OptionDraft[]>([
    { labelFr: '', labelEn: '' },
    { labelFr: '', labelEn: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | undefined>();
  const [openImmediately, setOpenImmediately] = useState(true);

  const toggleLevel = (lvl: UserLevel) => {
    setEligibleLevels((prev) =>
      prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl].sort(),
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;

    const payload: CreateVotePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      mode,
      scrutinType,
      maxChoices: scrutinType === 'single' ? 1 : maxChoices,
      allowBlank,
      eligibleLevels,
      quorumPct,
      majorityType,
      majorityBase,
      resultVisibility,
      openAt: openAt ? new Date(openAt).toISOString() : undefined,
      closeAt: closeAt ? new Date(closeAt).toISOString() : undefined,
      closeMode: closeAt ? 'auto' : 'manual',
      multiRound,
      topNForRound2: topN,
      options: options.filter((o) => o.labelFr.trim() && o.labelEn.trim()),
    };

    setErrorKey(undefined);
    setSubmitting(true);
    const res = await adminCreateVote(token, payload);
    if (!res.ok) {
      setSubmitting(false);
      setErrorKey(res.message);
      return;
    }
    const voteId = res.data.vote.id;
    if (openImmediately) {
      const openRes = await adminOpenVote(token, voteId);
      if (!openRes.ok) {
        setSubmitting(false);
        setErrorKey(openRes.message);
        return;
      }
    }
    setSubmitting(false);
    navigate(`/vote/admin/votes/${voteId}`, { replace: true });
  };

  return (
    <div className="bg-hc-bg-cream">
      <VoteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-hc-green-founder">
          {t('vote.admin.create.title')}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Title / description */}
          <div>
            <label className="mb-1 block text-sm font-bold text-hc-green-founder">
              {t('vote.admin.create.field_title')}
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-hc-green-founder">
              {t('vote.admin.create.field_description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              className={textareaClass}
            />
          </div>

          {/* Mode + scrutin */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_mode')}
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as VoteMode)}
                className={inputClass}
              >
                <option value="anonymous">{t('vote.admin.create.mode_anonymous')}</option>
                <option value="open">{t('vote.admin.create.mode_open')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_scrutin')}
              </label>
              <select
                value={scrutinType}
                onChange={(e) => {
                  const v = e.target.value as ScrutinType;
                  setScrutinType(v);
                  if (v === 'single') setMaxChoices(1);
                  else if (maxChoices < 2) setMaxChoices(2);
                }}
                className={inputClass}
              >
                <option value="single">{t('vote.admin.create.scrutin_single')}</option>
                <option value="multiple">{t('vote.admin.create.scrutin_multiple')}</option>
              </select>
            </div>
          </div>

          {scrutinType === 'multiple' && (
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_max_choices')}
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={maxChoices}
                onChange={(e) => setMaxChoices(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-bold text-hc-green-founder">
            <input
              type="checkbox"
              checked={allowBlank}
              onChange={(e) => setAllowBlank(e.target.checked)}
              className="h-4 w-4 accent-hc-green-accent"
            />
            {t('vote.admin.create.allow_blank')}
          </label>

          {/* Eligibility */}
          <div>
            <span className="mb-1 block text-sm font-bold text-hc-green-founder">
              {t('vote.admin.create.field_eligibility')}
            </span>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((lvl) => (
                <label key={lvl} className="flex items-center gap-2 text-sm text-hc-gray-text">
                  <input
                    type="checkbox"
                    checked={eligibleLevels.includes(lvl as UserLevel)}
                    onChange={() => toggleLevel(lvl as UserLevel)}
                    className="h-4 w-4 accent-hc-green-accent"
                  />
                  {t(`vote.admin.voters.level_${lvl}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Quorum + majority */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_quorum')}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={quorumPct}
                onChange={(e) => setQuorumPct(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_majority_type')}
              </label>
              <select
                value={majorityType}
                onChange={(e) => setMajorityType(e.target.value as MajorityType)}
                className={inputClass}
              >
                <option value="simple">{t('vote.admin.create.maj_simple')}</option>
                <option value="absolute">{t('vote.admin.create.maj_absolute')}</option>
                <option value="qualified_2_3">{t('vote.admin.create.maj_qualified_2_3')}</option>
                <option value="qualified_3_4">{t('vote.admin.create.maj_qualified_3_4')}</option>
                <option value="unanimous">{t('vote.admin.create.maj_unanimous')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_majority_base')}
              </label>
              <select
                value={majorityBase}
                onChange={(e) => setMajorityBase(e.target.value as MajorityBase)}
                className={inputClass}
              >
                <option value="expressed">{t('vote.admin.create.base_expressed')}</option>
                <option value="expressed_with_blank">
                  {t('vote.admin.create.base_expressed_with_blank')}
                </option>
                <option value="eligible">{t('vote.admin.create.base_eligible')}</option>
              </select>
            </div>
          </div>

          {/* Schedule + visibility + multi-round */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_open_at')}
              </label>
              <input
                type="datetime-local"
                value={openAt}
                onChange={(e) => setOpenAt(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs italic text-hc-gray-slate">
                {t('vote.admin.create.open_at_helper')}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_close_at')}
              </label>
              <input
                type="datetime-local"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs italic text-hc-gray-slate">
                {t('vote.admin.create.close_at_helper')}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-hc-green-founder">
                {t('vote.admin.create.field_visibility')}
              </label>
              <select
                value={resultVisibility}
                onChange={(e) => setResultVisibility(e.target.value as ResultVisibility)}
                className={inputClass}
              >
                <option value="on_close">{t('vote.admin.create.vis_on_close')}</option>
                <option value="immediate">{t('vote.admin.create.vis_immediate')}</option>
                <option value="admin_only">{t('vote.admin.create.vis_admin_only')}</option>
              </select>
            </div>
          </div>
          {openAt && (
            <div className="hc-info-box not-italic text-sm">
              {t('vote.admin.create.scheduled_hint')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-hc-green-founder">
              <input
                type="checkbox"
                checked={multiRound}
                onChange={(e) => setMultiRound(e.target.checked)}
                className="h-4 w-4 accent-hc-green-accent"
              />
              {t('vote.admin.create.multi_round')}
            </label>
            {multiRound && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-hc-gray-text">
                  {t('vote.admin.create.top_n')}
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="w-20 rounded border border-hc-gray-mid px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <h2 className="mb-2 text-base font-bold text-hc-green-founder">
              {t('vote.admin.create.options_title')}
            </h2>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('vote.admin.create.option_fr')}
                    value={opt.labelFr}
                    onChange={(e) =>
                      setOptions(options.map((o, i) => (i === idx ? { ...o, labelFr: e.target.value } : o)))
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder={t('vote.admin.create.option_en')}
                    value={opt.labelEn}
                    onChange={(e) =>
                      setOptions(options.map((o, i) => (i === idx ? { ...o, labelEn: e.target.value } : o)))
                    }
                    className={inputClass}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      className="rounded p-2 text-hc-red-alert hover:bg-hc-red-pale"
                      aria-label={t('vote.admin.create.option_remove')}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOptions([...options, { labelFr: '', labelEn: '' }])}
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-hc-green-pillar hover:text-hc-green-founder"
            >
              <Plus size={14} aria-hidden /> {t('vote.admin.create.option_add')}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-hc-green-founder">
            <input
              type="checkbox"
              checked={openImmediately}
              onChange={(e) => setOpenImmediately(e.target.checked)}
              className="h-4 w-4 accent-hc-green-accent"
            />
            {t('vote.admin.create.open_immediately')}
          </label>

          <ErrorMessage errorKey={errorKey} />

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? t('vote.admin.create.submitting') : t('vote.admin.create.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
