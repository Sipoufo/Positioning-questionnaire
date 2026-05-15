// pdf.tsx
// Renders the questionnaire response as a branded PDF using @react-pdf/renderer.
// Mirrors the "sandwich" structure of the Happy Cash charte: dark cover →
// cream content → dark closing.

import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Locale, Question, QuestionOption, ResponsePayload, Section } from '@hc/shared';
import { getVisibleQuestions, getVisibleSections } from '@hc/shared';

// -----------------------------------------------------------------------------
// Tokens (mirror DESIGN_SYSTEM.md)
// -----------------------------------------------------------------------------
const C = {
  greenFounder: '#1B5E20',
  greenPillar: '#2E7D32',
  greenAccent: '#4CAF50',
  greenSoft: '#81C784',
  greenPale: '#A5D6A7',
  bgCream: '#F1F8E9',
  bgMint: '#E8F5E9',
  white: '#FFFFFF',
  graySlate: '#546E7A',
  grayText: '#37474F',
  grayLight: '#ECEFF1',
} as const;

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: C.greenFounder,
    padding: 56,
    justifyContent: 'center',
  },
  coverEyebrow: { color: C.greenSoft, fontSize: 11, letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
  coverTitle: { color: C.white, fontSize: 36, fontFamily: 'Helvetica-Bold', marginTop: 12 },
  coverSubtitle: { color: C.greenSoft, fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  coverMeta: { color: C.greenPale, fontSize: 10, marginTop: 36, lineHeight: 1.5 },

  page: { backgroundColor: C.bgCream, padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: C.grayText },
  banner: {
    backgroundColor: C.greenPillar,
    color: C.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  bannerEyebrow: { color: C.greenPale, fontSize: 8, marginBottom: 2 },
  bannerTitle: { color: C.white, fontSize: 12, fontFamily: 'Helvetica-Bold' },

  subBanner: {
    backgroundColor: C.bgMint,
    color: C.greenFounder,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderLeftWidth: 4,
    borderLeftColor: C.greenAccent,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  intro: {
    backgroundColor: C.bgMint,
    borderLeftWidth: 4,
    borderLeftColor: C.greenPillar,
    color: C.greenFounder,
    padding: 8,
    fontStyle: 'italic',
    fontSize: 9,
    marginBottom: 8,
  },

  qaBlock: { marginBottom: 8 },
  qLabel: { color: C.greenFounder, fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 2 },
  qAnswer: { color: C.grayText, fontSize: 10, lineHeight: 1.45 },
  qAnswerMuted: { color: C.graySlate, fontSize: 10, fontStyle: 'italic' },
  qBullet: { color: C.grayText, fontSize: 10, lineHeight: 1.45, marginLeft: 10 },
  qPrecise: { color: C.greenPillar, fontSize: 9, fontStyle: 'italic', marginLeft: 10, marginTop: 1 },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 40,
    right: 40,
    color: C.graySlate,
    fontSize: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: C.grayLight,
    paddingTop: 6,
  },

  closing: { flex: 1, backgroundColor: C.greenFounder, padding: 56, justifyContent: 'center', alignItems: 'center' },
  closingTitle: { color: C.white, fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  closingBody: { color: C.greenPale, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 1.5 },
});

// -----------------------------------------------------------------------------
// Localized strings used inside the PDF (kept here for backend independence)
// -----------------------------------------------------------------------------
const TXT = {
  fr: {
    docTitle: 'Questionnaire de Positionnement — Happy Cash',
    subtitle: 'Mai 2026 — Version 1.0',
    section: 'Section',
    submittedOn: 'Soumis le',
    by: 'Par',
    cover_meta: 'Document confidentiel — Happy Cash · Collectif entrepreneurial',
    footer_left: 'Happy Cash · Document confidentiel',
    closing_title: 'Merci pour ta contribution',
    closing_body:
      "Ta soumission est enregistrée. L'administrateur reçoit également une copie. À très vite pour la 2e réunion.",
    no_answer: '(pas de réponse)',
    precise: 'Précision',
  },
  en: {
    docTitle: 'Positioning Questionnaire — Happy Cash',
    subtitle: 'May 2026 — Version 1.0',
    section: 'Section',
    submittedOn: 'Submitted on',
    by: 'By',
    cover_meta: 'Confidential document — Happy Cash · Entrepreneurial collective',
    footer_left: 'Happy Cash · Confidential document',
    closing_title: 'Thank you for your contribution',
    closing_body:
      'Your submission has been recorded. The administrator also receives a copy. See you soon at the 2nd meeting.',
    no_answer: '(no answer)',
    precise: 'Specification',
  },
} as const;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const formatDate = (iso: string, locale: Locale): string => {
  try {
    return new Date(iso).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const findOptionLabel = (question: Question, value: string, locale: Locale): string => {
  if (!('options' in question)) return value;
  const opt = (question.options as QuestionOption[]).find((o) => o.value === value);
  return opt ? opt.label[locale] : value;
};

const Footer = ({ locale }: { locale: Locale }) => (
  <View style={styles.footer} fixed>
    <Text>{TXT[locale].footer_left}</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </View>
);

// -----------------------------------------------------------------------------
// Question rendering
// -----------------------------------------------------------------------------
interface QABlockProps {
  question: Question;
  response: ResponsePayload;
  locale: Locale;
}

const QABlock = ({ question, response, locale }: QABlockProps) => {
  const raw = response[question.id];
  const precise = response[`${question.id}:precise`];
  const TXT_L = TXT[locale];

  const labelEl = (
    <Text style={styles.qLabel}>
      {question.id.toUpperCase()} — {question.label[locale]}
    </Text>
  );

  const isEmpty =
    raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);

  if (isEmpty) {
    return (
      <View style={styles.qaBlock} wrap={false}>
        {labelEl}
        <Text style={styles.qAnswerMuted}>{TXT_L.no_answer}</Text>
      </View>
    );
  }

  if (question.type === 'checkbox' || question.type === 'consent') {
    const arr = Array.isArray(raw) ? raw : [];
    return (
      <View style={styles.qaBlock} wrap={false}>
        {labelEl}
        {arr.map((v) => (
          <Text key={v} style={styles.qBullet}>
            • {findOptionLabel(question, v, locale)}
          </Text>
        ))}
        {typeof precise === 'string' && precise ? (
          <Text style={styles.qPrecise}>↳ {TXT_L.precise}: {precise}</Text>
        ) : null}
      </View>
    );
  }

  if (question.type === 'radio' || question.type === 'scale') {
    const label = typeof raw === 'string' ? findOptionLabel(question, raw, locale) : '';
    return (
      <View style={styles.qaBlock} wrap={false}>
        {labelEl}
        <Text style={styles.qAnswer}>{label}</Text>
        {typeof precise === 'string' && precise ? (
          <Text style={styles.qPrecise}>↳ {TXT_L.precise}: {precise}</Text>
        ) : null}
      </View>
    );
  }

  // text / tel / email / textarea
  return (
    <View style={styles.qaBlock} wrap={false}>
      {labelEl}
      <Text style={styles.qAnswer}>{typeof raw === 'string' ? raw : ''}</Text>
    </View>
  );
};

const SectionBlock = ({
  section,
  response,
  locale,
}: {
  section: Section;
  response: ResponsePayload;
  locale: Locale;
}) => {
  const questions = getVisibleQuestions(section, response);
  if (questions.length === 0) return null;
  return (
    <View wrap>
      <View style={styles.banner} wrap={false}>
        <Text style={styles.bannerEyebrow}>
          {TXT[locale].section} {section.number}
        </Text>
        <Text style={styles.bannerTitle}>{section.title[locale]}</Text>
      </View>
      {section.intro ? <Text style={styles.intro}>{section.intro[locale]}</Text> : null}
      {questions.map((q) => (
        <QABlock key={q.id} question={q} response={response} locale={locale} />
      ))}
    </View>
  );
};

// -----------------------------------------------------------------------------
// Document
// -----------------------------------------------------------------------------
interface QuestionnairePdfProps {
  response: ResponsePayload;
  locale: Locale;
  submittedAt: string;
}

const QuestionnairePdf = ({ response, locale, submittedAt }: QuestionnairePdfProps) => {
  const visibleSections = getVisibleSections(response);
  const fullName = typeof response['q1.1'] === 'string' ? response['q1.1'] : '—';
  const email = typeof response['q1.3'] === 'string' ? response['q1.3'] : '—';
  const TXT_L = TXT[locale];

  return (
    <Document title={TXT_L.docTitle} author="Happy Cash">
      {/* Cover */}
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverEyebrow}>HAPPY CASH</Text>
        <Text style={styles.coverTitle}>{TXT_L.docTitle}</Text>
        <Text style={styles.coverSubtitle}>{TXT_L.subtitle}</Text>
        <Text style={styles.coverMeta}>
          {TXT_L.by} {fullName} · {email}
          {'\n'}
          {TXT_L.submittedOn} {formatDate(submittedAt, locale)}
          {'\n\n'}
          {TXT_L.cover_meta}
        </Text>
      </Page>

      {/* Content — one Page per ~3 sections for readability, but @react-pdf will
          auto-paginate inside a single Page wrap context. */}
      <Page size="A4" style={styles.page} wrap>
        {visibleSections.map((section) => (
          <SectionBlock
            key={section.number}
            section={section}
            response={response}
            locale={locale}
          />
        ))}
        <Footer locale={locale} />
      </Page>

      {/* Closing — dark slice */}
      <Page size="A4" style={styles.closing}>
        <Text style={styles.closingTitle}>{TXT_L.closing_title}</Text>
        <Text style={styles.closingBody}>{TXT_L.closing_body}</Text>
      </Page>
    </Document>
  );
};

/**
 * Renders the questionnaire response to a PDF buffer ready for email attachment.
 * @param input - response payload, locale and submission timestamp.
 * @returns A Buffer containing the PDF bytes.
 */
export const renderQuestionnairePdf = async (input: QuestionnairePdfProps): Promise<Buffer> => {
  const element = (
    <QuestionnairePdf
      response={input.response}
      locale={input.locale}
      submittedAt={input.submittedAt}
    />
  );
  return renderToBuffer(element);
};
