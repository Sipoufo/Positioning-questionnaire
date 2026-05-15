// useFormState.ts
// Owns the response payload, localStorage persistence (under `hc:draft`), and
// the step index. Sections whose `visibleWhen` predicate returns false are
// transparently skipped when stepping forward or backward.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Answer, PartialResponse } from '@hc/shared';
import { getVisibleSections } from '@hc/shared';

const DRAFT_KEY = 'hc:draft';
const STEP_KEY = 'hc:step';

interface PersistedDraft {
  response: PartialResponse;
  stepIndex: number;
  savedAt: string;
}

const loadDraft = (): PersistedDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraft;
    if (!parsed.response) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (draft: PersistedDraft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_KEY, String(draft.stepIndex));
  } catch {
    // Quota exceeded or storage disabled — ignore silently.
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Stateful form controller. Returns the response, dispatchers, the list of
 * visible sections, and the current step index (clamped to a valid range).
 */
export const useFormState = () => {
  const [response, setResponse] = useState<PartialResponse>(() => {
    const draft = loadDraft();
    return draft?.response ?? {};
  });
  const [stepIndex, setStepIndex] = useState<number>(() => loadDraft()?.stepIndex ?? 0);

  const visibleSections = useMemo(() => getVisibleSections(response), [response]);
  const totalSteps = visibleSections.length;

  // Clamp step index when conditional sections appear/disappear.
  useEffect(() => {
    if (totalSteps === 0) return;
    if (stepIndex >= totalSteps) {
      setStepIndex(totalSteps - 1);
    }
  }, [stepIndex, totalSteps]);

  // Persist on every change.
  useEffect(() => {
    saveDraft({ response, stepIndex, savedAt: new Date().toISOString() });
  }, [response, stepIndex]);

  const setAnswer = useCallback((id: string, value: Answer) => {
    setResponse((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setPrecise = useCallback((id: string, value: string) => {
    setResponse((prev) => {
      const key = `${id}:precise`;
      if (!value) {
        // Drop the companion field entirely when cleared so it doesn't bloat the payload.
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const previous = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    clearDraft();
    setResponse({});
    setStepIndex(0);
  }, []);

  return {
    response,
    setAnswer,
    setPrecise,
    visibleSections,
    stepIndex,
    totalSteps,
    next,
    previous,
    reset,
    hasDraft: Object.keys(response).length > 0,
  };
};

export { DRAFT_KEY };
