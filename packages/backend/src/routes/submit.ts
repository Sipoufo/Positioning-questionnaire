// routes/submit.ts
// POST /api/submit — validates the payload against the shared schema, renders
// the PDF and emails it to the admin + the respondent.

import { Router } from 'express';
import { submissionSchema, validateFullResponse } from '@hc/shared';
import type { Locale } from '@hc/shared';
import { renderQuestionnairePdf } from '../services/pdf.js';
import { sendSubmissionEmail } from '../services/email.js';

export const submitRoute = Router();

submitRoute.post('/', async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'invalid_payload' });
  }

  const validation = validateFullResponse(parsed.data.response);
  if (!validation.ok) {
    return res.status(422).json({ message: 'validation_failed', fieldErrors: validation.errors });
  }

  const locale: Locale = parsed.data.locale;
  const submittedAt = parsed.data.submittedAt;

  try {
    const pdfBuffer = await renderQuestionnairePdf({
      response: validation.data,
      locale,
      submittedAt,
    });

    await sendSubmissionEmail({
      response: validation.data,
      locale,
      submittedAt,
      pdfBuffer,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Submission failed:', err);
    return res.status(500).json({ message: 'submit_failed' });
  }
});
