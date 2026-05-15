// Questionnaire.tsx
// Step-by-step engine. Renders one visible section per step, runs Zod-derived
// validation on "Next", and submits the cleaned payload on the final step.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import type { Locale, Section } from '@hc/shared';
import {
  isQuestionRequired,
  getVisibleQuestions,
  validateSection,
  validateFullResponse,
} from '@hc/shared';
import { useFormState } from '../features/questionnaire/useFormState';
import { QuestionRenderer } from '../components/form/QuestionRenderer';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { submitQuestionnaire } from '../services/api';

export const Questionnaire = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang: Locale = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

  const {
    response,
    setAnswer,
    setPrecise,
    visibleSections,
    stepIndex,
    totalSteps,
    next,
    previous,
    reset,
  } = useFormState();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (totalSteps === 0 || stepIndex >= visibleSections.length) {
    // Shouldn't happen — defensive guard during conditional flips.
    return null;
  }

  const currentSection = visibleSections[stepIndex] as Section;
  const visibleQuestions = getVisibleQuestions(currentSection, response);
  const isLastStep = stepIndex === totalSteps - 1;

  const validateCurrent = (): boolean => {
    const stepErrors = validateSection(currentSection, response);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrent()) {
      // Smooth scroll to first error.
      const firstId = Object.keys(errors)[0];
      if (firstId) {
        document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setErrors({});
    next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setErrors({});
    previous();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateCurrent()) return;
    const result = validateFullResponse(response);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const apiResult = await submitQuestionnaire(result.data, lang);
    setSubmitting(false);
    if (apiResult.ok) {
      reset();
      navigate('/success');
      return;
    }
    if (apiResult.fieldErrors) setErrors(apiResult.fieldErrors);
    setSubmitError(apiResult.message);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ProgressBar current={stepIndex + 1} total={totalSteps} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection.number}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          <header className="hc-banner rounded-t-md">
            <span className="text-xs font-bold uppercase tracking-widest text-hc-green-pale">
              {t('step.section')} {currentSection.number}
            </span>
            <h2 className="mt-0.5 text-lg leading-tight">{currentSection.title[lang]}</h2>
          </header>

          {currentSection.intro ? (
            <div className="hc-info-box not-italic rounded-b-md border-t-0">
              {currentSection.intro[lang]}
            </div>
          ) : null}

          <div className="mt-6 space-y-8">
            {visibleQuestions.map((question) => (
              <QuestionRenderer
                key={question.id}
                question={question}
                value={response[question.id]}
                preciseValue={
                  typeof response[`${question.id}:precise`] === 'string'
                    ? (response[`${question.id}:precise`] as string)
                    : undefined
                }
                errorKey={errors[question.id]}
                required={isQuestionRequired(question, response)}
                onChange={setAnswer}
                onChangePrecise={setPrecise}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {submitError ? (
        <div className="hc-alert-box mt-6">{t(`errors.${submitError}`, { defaultValue: submitError })}</div>
      ) : null}

      <nav className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={stepIndex === 0 || submitting}
        >
          <ArrowLeft size={16} aria-hidden /> {t('step.previous')}
        </Button>

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
            {submitting ? t('step.sending') : t('step.submit')}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={submitting}>
            {t('step.next')} <ArrowRight size={16} aria-hidden />
          </Button>
        )}
      </nav>
    </div>
  );
};
