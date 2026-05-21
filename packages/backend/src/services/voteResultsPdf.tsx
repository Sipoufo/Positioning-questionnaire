// voteResultsPdf.tsx
// Branded results PDF for a closed vote round. Mirrors the design tokens
// already used by the questionnaire PDF (`services/pdf.tsx`).

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Locale, RoundResult } from '@hc/shared';

// Colors duplicated from DESIGN_SYSTEM.md (cannot import the CSS tokens).
const C = {
  founder: '#1B5E20',
  pillar: '#2E7D32',
  accent: '#4CAF50',
  soft: '#81C784',
  pale: '#A5D6A7',
  cream: '#F1F8E9',
  mint: '#E8F5E9',
  white: '#FFFFFF',
  grayText: '#37474F',
  graySlate: '#546E7A',
  grayMid: '#B0BEC5',
  grayLight: '#ECEFF1',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.cream,
    padding: 36,
    fontFamily: 'Helvetica',
    color: C.grayText,
    fontSize: 10,
  },
  cover: {
    backgroundColor: C.founder,
    color: C.white,
    padding: 36,
    height: '100%',
  },
  coverTitle: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
  coverSubtitle: { fontSize: 14, color: C.soft, marginBottom: 8 },
  banner: {
    backgroundColor: C.pillar,
    color: C.white,
    padding: 8,
    fontSize: 12,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 8,
  },
  subBanner: {
    backgroundColor: C.mint,
    color: C.founder,
    borderLeft: `4pt solid ${C.accent}`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontWeight: 700,
    fontSize: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  kvRow: { flexDirection: 'row', marginBottom: 2 },
  kvKey: { width: 140, fontWeight: 700, color: C.founder },
  kvValue: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.founder,
    color: C.white,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontWeight: 700,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: `0.4pt solid ${C.accent}`,
  },
  tableRowAlt: { backgroundColor: C.mint },
  colOption: { flex: 4 },
  colCount: { width: 60, textAlign: 'right' },
  colPct: { width: 60, textAlign: 'right' },
  verdictOk: {
    backgroundColor: C.mint,
    border: `1pt solid ${C.accent}`,
    borderLeft: `4pt solid ${C.pillar}`,
    padding: 8,
    color: C.founder,
    fontWeight: 700,
    marginTop: 12,
  },
  verdictKo: {
    backgroundColor: '#FFEBEE',
    border: `1pt solid #C62828`,
    borderLeft: `4pt solid #C62828`,
    padding: 8,
    color: '#C62828',
    fontWeight: 700,
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 8,
    color: C.graySlate,
    textAlign: 'center',
  },
  receiptList: {
    fontSize: 8,
    color: C.graySlate,
    lineHeight: 1.4,
    marginTop: 8,
  },
});

interface RenderArgs {
  voteTitle: string;
  roundNumber: number;
  locale: Locale;
  closedAt: string;
  result: RoundResult;
  optionLabels: Map<string, string>;
  /** One entry per ballot — `null` choice = blank. */
  receipts: { code: string; choiceLabels: string[]; isBlank: boolean }[];
  majorityType: string;
  majorityBase: string;
  quorumPct: number;
}

const fmtPct = (n: number): string => `${n.toFixed(1)}%`;

const PdfDoc = ({
  voteTitle,
  roundNumber,
  locale,
  closedAt,
  result,
  optionLabels,
  receipts,
  majorityType,
  majorityBase,
  quorumPct,
}: RenderArgs) => {
  const fr = locale === 'fr';
  const baseLabel: Record<string, string> = fr
    ? {
        expressed: 'exprimés',
        expressed_with_blank: 'exprimés (blancs inclus)',
        eligible: 'éligibles',
      }
    : {
        expressed: 'cast',
        expressed_with_blank: 'cast (blank included)',
        eligible: 'eligible',
      };
  const winnerLabels = result.winners
    .map((id) => optionLabels.get(id) ?? id)
    .join(', ');
  const closedAtFmt = new Date(closedAt).toLocaleString(fr ? 'fr-FR' : 'en-GB');

  return (
    <Document>
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverSubtitle}>{fr ? 'Résultats du vote' : 'Vote results'}</Text>
        <Text style={styles.coverTitle}>{voteTitle}</Text>
        <Text style={{ color: C.pale, fontSize: 11 }}>
          {fr ? 'Tour' : 'Round'} {roundNumber} · {closedAtFmt}
        </Text>
        <View style={{ position: 'absolute', bottom: 36, left: 36, right: 36 }}>
          <Text style={{ color: C.pale, fontSize: 9 }}>
            Happy Cash · {fr ? 'Document confidentiel' : 'Confidential document'}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.banner}>{fr ? 'Synthèse' : 'Summary'}</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>{fr ? 'Participation' : 'Turnout'}</Text>
          <Text style={styles.kvValue}>
            {result.totalBallots} / {result.totalEligible} ({fmtPct(result.participationPct)})
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>{fr ? 'Quorum requis' : 'Quorum required'}</Text>
          <Text style={styles.kvValue}>
            {fmtPct(quorumPct)} —{' '}
            {result.quorumMet ? (fr ? 'atteint ✓' : 'met ✓') : fr ? 'non atteint ✕' : 'not met ✕'}
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>{fr ? 'Majorité requise' : 'Majority required'}</Text>
          <Text style={styles.kvValue}>
            {majorityType} ({fr ? 'sur ' : 'on '}
            {baseLabel[majorityBase] ?? majorityBase})
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>{fr ? 'Bulletins blancs' : 'Blank ballots'}</Text>
          <Text style={styles.kvValue}>{result.blankCount}</Text>
        </View>

        <Text style={styles.banner}>{fr ? 'Dépouillement' : 'Tally'}</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colOption}>{fr ? 'Option' : 'Option'}</Text>
          <Text style={styles.colCount}>{fr ? 'Voix' : 'Votes'}</Text>
          <Text style={styles.colPct}>%</Text>
        </View>
        {result.tallies
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((t, idx) => {
            const base =
              majorityBase === 'expressed'
                ? result.totalBallots - result.blankCount
                : majorityBase === 'expressed_with_blank'
                  ? result.totalBallots
                  : result.totalEligible;
            const pct = base > 0 ? (t.count / base) * 100 : 0;
            return (
              <View
                key={t.optionId}
                style={[styles.tableRow, idx % 2 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colOption}>
                  {optionLabels.get(t.optionId) ?? t.optionId}
                </Text>
                <Text style={styles.colCount}>{t.count}</Text>
                <Text style={styles.colPct}>{fmtPct(pct)}</Text>
              </View>
            );
          })}

        {result.majorityMet ? (
          <View style={styles.verdictOk}>
            <Text>
              {fr ? 'Verdict : majorité atteinte — ' : 'Verdict: majority met — '}
              {winnerLabels}
            </Text>
          </View>
        ) : (
          <View style={styles.verdictKo}>
            <Text>
              {fr
                ? 'Verdict : majorité non atteinte. Un second tour ou un nouveau vote est nécessaire.'
                : 'Verdict: majority not met. A second round or a new vote is needed.'}
            </Text>
          </View>
        )}

        {receipts.length > 0 && (
          <>
            <Text style={styles.subBanner}>
              {fr
                ? 'Codes de vérification (un par bulletin)'
                : 'Verification codes (one per ballot)'}
            </Text>
            <View style={styles.receiptList}>
              {receipts.map((r) => (
                <Text key={r.code}>
                  {r.code} → {r.isBlank ? (fr ? 'blanc' : 'blank') : r.choiceLabels.join(', ')}
                </Text>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer} fixed>
          Happy Cash · {fr ? 'Confidentiel' : 'Confidential'} · {closedAtFmt}
        </Text>
      </Page>
    </Document>
  );
};

/** Renders the results PDF and returns a Buffer ready to attach to an email. */
export const renderVoteResultsPdf = async (args: RenderArgs): Promise<Buffer> => {
  return renderToBuffer(<PdfDoc {...args} />);
};
