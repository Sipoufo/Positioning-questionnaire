// voteEmail.ts
// Email templates for the vote module. Reuses the Nodemailer transporter
// declared in `email.ts` indirectly via a fresh `createTransport` call with
// the same config — the transporter is cheap to construct and isolating it
// here keeps vote emails decoupled from the questionnaire submission email.

import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
});

const FROM = `"${config.MAIL_FROM_NAME}" <${config.MAIL_FROM_ADDRESS}>`;

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Wraps a body of arbitrary HTML in the Happy Cash branded card layout used
 * across every vote email (magic link, vote opened, results). Keeps the
 * inline styles in one place — Gmail / Outlook strip <style> tags.
 */
const layout = (opts: { title: string; bodyHtml: string; footerHtml: string }): string => `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F1F8E9;font-family:Helvetica,Arial,sans-serif;color:#37474F;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F8E9;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8F5E9;border-left:4px solid #4CAF50;border-radius:6px;">
        <tr><td style="background:#1B5E20;color:#FFFFFF;padding:18px 22px;font-size:18px;font-weight:bold;border-radius:6px 6px 0 0;">
          ${opts.title}
        </td></tr>
        <tr><td style="padding:20px 22px;font-size:14px;line-height:1.5;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="background:#1B5E20;color:#A5D6A7;padding:10px 22px;font-size:11px;text-align:center;border-radius:0 0 6px 6px;">
          ${opts.footerHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

interface MagicLinkArgs {
  to: string;
  fullName: string;
  rawToken: string;
  ttlHours: number;
}

/**
 * Sends a magic-link login email. The raw token is embedded in a query
 * string pointing at the SPA's `/vote/verify` page — the SPA then POSTs it
 * to the API to exchange for a session token.
 */
export const sendMagicLinkEmail = async (args: MagicLinkArgs): Promise<void> => {
  const verifyUrl = `${config.VOTE_BASE_URL}/vote/verify?token=${args.rawToken}`;
  const title = 'Happy Cash — Lien de connexion';
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Bonjour ${escapeHtml(args.fullName)},</p>
    <p style="margin:0 0 16px 0;">Cliquez sur le bouton ci-dessous pour vous connecter à l'espace de vote Happy Cash. Ce lien est valable ${args.ttlHours}&nbsp;heures et ne peut être utilisé qu'une seule fois.</p>
    <p style="margin:0 0 16px 0;text-align:center;">
      <a href="${verifyUrl}" style="display:inline-block;background:#2E7D32;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Me connecter</a>
    </p>
    <p style="margin:0 0 8px 0;font-size:12px;color:#546E7A;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
    <p style="margin:0;font-size:12px;color:#546E7A;word-break:break-all;">${escapeHtml(verifyUrl)}</p>
  `;
  const footerHtml = "Happy Cash · Si vous n'avez pas demandé ce lien, ignorez cet email.";

  await transporter.sendMail({
    from: FROM,
    to: args.to,
    subject: title,
    html: layout({ title, bodyHtml, footerHtml }),
  });
};

interface ResultsEmailArgs {
  to: string;
  voteTitle: string;
  roundNumber: number;
  participation: string; // pre-formatted "12/20 (60%)"
  verdict: string;
  pdfBuffer: Buffer;
}

/**
 * Sends the round-close notification + branded PDF attachment. Used both
 * for the admin recap and (optionally) for any participant who opted in.
 */
export const sendVoteResultsEmail = async (args: ResultsEmailArgs): Promise<void> => {
  const title = `Happy Cash — Résultats : ${args.voteTitle}`;
  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Le tour ${args.roundNumber} du vote <strong>${escapeHtml(
      args.voteTitle,
    )}</strong> vient d'être clôturé.</p>
    <table cellpadding="6" cellspacing="0" style="background:#E8F5E9;border-left:4px solid #2E7D32;font-size:13px;">
      <tr><td style="font-weight:bold;color:#1B5E20;">Participation</td><td>${escapeHtml(args.participation)}</td></tr>
      <tr><td style="font-weight:bold;color:#1B5E20;">Verdict</td><td>${escapeHtml(args.verdict)}</td></tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:13px;">Le PDF détaillé est joint à cet email.</p>
  `;
  const footerHtml = 'Happy Cash · Document confidentiel';

  await transporter.sendMail({
    from: FROM,
    to: args.to,
    subject: title,
    html: layout({ title, bodyHtml, footerHtml }),
    attachments: [
      {
        filename: `happy-cash-vote-${args.roundNumber}.pdf`,
        content: args.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};
