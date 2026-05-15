// email.ts
// Sends the submission to the admin and a copy to the respondent. The PDF is
// attached, and a short HTML body mirrors the Happy Cash palette for inline
// readability.

import nodemailer from 'nodemailer';
import type { Locale, ResponsePayload } from '@hc/shared';
import { config } from '../config.js';

interface SendArgs {
  response: ResponsePayload;
  locale: Locale;
  submittedAt: string;
  pdfBuffer: Buffer;
}

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

const buildHtml = (
  fullName: string,
  level: string | undefined,
  locale: Locale,
  submittedAt: string,
): string => {
  const fr = locale === 'fr';
  const title = fr
    ? 'Nouvelle soumission — Questionnaire de positionnement'
    : 'New submission — Positioning Questionnaire';
  const introAdmin = fr
    ? "Une nouvelle réponse a été soumise. Le PDF complet est en pièce jointe."
    : 'A new response has been submitted. The full PDF is attached.';
  const labelName = fr ? 'Nom' : 'Name';
  const labelLevel = fr ? 'Niveau choisi' : 'Chosen level';
  const labelDate = fr ? 'Soumis le' : 'Submitted on';
  const formattedDate = new Date(submittedAt).toLocaleString(fr ? 'fr-FR' : 'en-GB');

  return `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#F1F8E9;font-family:Helvetica,Arial,sans-serif;color:#37474F;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F8E9;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8F5E9;border-left:4px solid #4CAF50;border-radius:6px;">
        <tr><td style="background:#1B5E20;color:#FFFFFF;padding:18px 22px;font-size:18px;font-weight:bold;border-radius:6px 6px 0 0;">
          ${title}
        </td></tr>
        <tr><td style="padding:20px 22px;font-size:14px;line-height:1.5;">
          <p style="margin:0 0 12px 0;">${introAdmin}</p>
          <table cellpadding="6" cellspacing="0" style="background:#E8F5E9;border-left:4px solid #2E7D32;font-size:13px;">
            <tr><td style="font-weight:bold;color:#1B5E20;">${labelName}</td><td>${escapeHtml(fullName)}</td></tr>
            ${level ? `<tr><td style="font-weight:bold;color:#1B5E20;">${labelLevel}</td><td>${escapeHtml(level)}</td></tr>` : ''}
            <tr><td style="font-weight:bold;color:#1B5E20;">${labelDate}</td><td>${escapeHtml(formattedDate)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#1B5E20;color:#A5D6A7;padding:10px 22px;font-size:11px;text-align:center;border-radius:0 0 6px 6px;">
          Happy Cash · ${fr ? 'Document confidentiel' : 'Confidential document'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Sends two emails: one to the admin (always) and a courtesy copy to the
 * respondent if a valid email was provided in Q1.3. The PDF is attached
 * to both.
 */
export const sendSubmissionEmail = async ({
  response,
  locale,
  submittedAt,
  pdfBuffer,
}: SendArgs): Promise<void> => {
  const fullName = typeof response['q1.1'] === 'string' ? response['q1.1'] : '—';
  const respondentEmail = typeof response['q1.3'] === 'string' ? response['q1.3'] : '';
  const level = typeof response['q2.1'] === 'string' ? response['q2.1'] : undefined;

  const subjectAdmin =
    locale === 'fr'
      ? `[Happy Cash] Nouvelle réponse de ${fullName}`
      : `[Happy Cash] New response from ${fullName}`;
  const subjectRespondent =
    locale === 'fr'
      ? 'Happy Cash — Copie de ta soumission'
      : 'Happy Cash — Copy of your submission';

  const attachment = {
    filename: `happy-cash-positionnement-${slug(fullName)}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  };

  const from = `"${config.MAIL_FROM_NAME}" <${config.MAIL_FROM_ADDRESS}>`;
  const html = buildHtml(fullName, level, locale, submittedAt);

  // Admin email — always sent.
  await transporter.sendMail({
    from,
    to: config.ADMIN_EMAIL,
    subject: subjectAdmin,
    html,
    attachments: [attachment],
  });

  // Respondent copy — only if their email looks valid.
  if (respondentEmail && /.+@.+\..+/.test(respondentEmail)) {
    await transporter.sendMail({
      from,
      to: respondentEmail,
      subject: subjectRespondent,
      html,
      attachments: [attachment],
    });
  }
};

const slug = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'submission';
