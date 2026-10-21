import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useReport, useTransactions } from '@/api/live';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { CategoryIcon, ClaimRow } from '@/components/claim-row';
import { PeriodButton, SearchField } from '@/components/filters';
import { Page } from '@/components/page';
import { ReportShare } from '@/components/report-share';
import { Avatar, Button, Card } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { reportRange, setReportFilter, useReportFilter } from '@/lib/filters';
import { amount, category, nameOf, omr, percent, person, unit, vendor } from '@/lib/format';
import { rowKeyOf } from '@/lib/report-tables';
import { groupLines, reportFor, reportPresets, rowName, type ReportView } from '@/mock/report';
import { useMockState, useSession } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

function BarRow({ view, rowKey, value, max, note, first }: { view: ReportView; rowKey: string; value: number; max: number; note: string; first: boolean }) {
  const palette = usePalette();
  const { language } = useLanguage();
  const name = rowName(view, rowKey, language.code);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>
      {view === 'category' ? <CategoryIcon categoryId={rowKey} size={36} /> : view === 'employee' ? <Avatar name={person(rowKey)?.nameEn ?? name} id={rowKey} size={36} /> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
          <AppText variant="small" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="small" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
            {amount(value, language.code)}
          </AppText>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceStrong, overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(2, (value / max) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: palette.primary }} />
        </View>
        <AppText variant="caption" tone="muted">
          {note}
        </AppText>
      </View>
    </View>
  );
}

type Bar = { key: string; value: number; note: string };
type Txn = { id: string; title: string; reference: string; date: string; value: number; status: 'inApproval' | 'approved' | 'paid'; categoryId: string; note: string; opens: boolean };

/** One report opened from Reports: by category, department, project, employee, merchant, or every claim. */
export default function ReportViewScreen() {
  const { view } = useLocalSearchParams<{ view: ReportView }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { persona } = useSession();
  const { user } = useAppSession();
  const { period, search } = useReportFilter();
  const isTxn = view === 'transactions';

  // Live: the API's report; transactions come fifty at a time. Demo: worked out from the sample.
  const range = reportRange(period);
  const report = useReport(isTxn ? 'category' : view, range, search, !!user && !isTxn);
  const txns = useTransactions(range, search, !!user && isTxn);
  const sample = useMemo(() => reportFor(state.claims, persona, period, search), [state.claims, persona, period, search]);

  // Shares to one decimal, as the web's reports show them.
  const claimsNote = (count: number, value: number, total: number) => `${t('web:dash.my.claimsCount', { count })} · ${percent(total ? (value / total) * 100 : 0, code)}`;
  let counted = 0;
  let total = 0;
  let bars: Bar[] = [];
  let rows: Txn[] = [];
  let ready = true;
  if (user && !isTxn) {
    const d = report.data;
    ready = !!d;
    if (d) {
      counted = d.totals.claims;
      total = d.totals.claimed;
      bars = d.rows.map((r) => ({
        key: rowKeyOf(view, r),
        value: r.claimed,
        note: `${claimsNote(r.claims, r.claimed, total)}${r.available !== undefined && r.available !== null ? ` · ${t('web:report.column.available')}: ${amount(r.available, code)}` : ''}`,
      }));
    }
  } else if (user) {
    const pages = txns.data?.pages;
    ready = !!pages;
    if (pages) {
      counted = pages[0].totals.claims;
      total = pages[0].totals.claimed;
      rows = pages.flatMap((pg) => pg.rows).map((r) => ({
        id: r.id,
        title: r.vendorId ? nameOf(vendor(r.vendorId), code) : r.payeeName || nameOf(category(r.categoryId), code),
        reference: r.reference,
        date: r.expenseDate,
        value: r.gross,
        status: r.reportStatus,
        categoryId: r.categoryId,
        note: `${nameOf(person(r.beneficiaryId), code)} · ${nameOf(category(r.categoryId), code)}`,
        opens: true,
      }));
    }
  } else {
    const lines = sample.lines;
    // Department and project reports count only the claims charged there.
    const kept = view === 'department' || view === 'project' ? lines.filter((l) => l.costLevel === view) : lines;
    counted = kept.length;
    total = kept.reduce((sum, l) => sum + l.gross, 0);
    if (isTxn) {
      rows = lines.map((l) => ({
        id: l.id,
        title: l.description,
        reference: l.reference,
        date: l.expenseDate,
        value: l.gross,
        status: l.status,
        categoryId: l.categoryId,
        note: `${nameOf(person(l.beneficiaryId), code)} · ${l.vendorId ? nameOf(vendor(l.vendorId), code) : (l.payeeName ?? nameOf(unit(l.costId), code))}`,
        opens: state.claims.some((c) => c.id === l.id),
      }));
    } else {
      bars = groupLines(lines, view).map((r) => ({ key: r.key, value: r.amount, note: claimsNote(r.count, r.amount, total) }));
    }
  }
  const failed = user ? (isTxn ? txns.error : report.error) : null;
  const empty = isTxn ? !rows.length : !bars.length;

  return (
    <Page title={t(`web:report.column.${view}`)}>
      <AppText variant="small" tone="secondary">
        {t(`web:report.purpose.${view}`)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText variant="small" tone="muted" style={{ flexShrink: 1 }}>
          {t('claims.summary', { count: counted, amount: omr(total, code) })}
        </AppText>
        <PeriodButton value={period} onChange={(p) => setReportFilter({ period: p })} presets={reportPresets} />
      </View>
      <SearchField value={search} onChangeText={(s) => setReportFilter({ search: s })} placeholder={t(isTxn ? 'reports.search' : 'web:report.search.summary')} />

      {!ready ? (
        failed ? <AppText tone="danger">{failed.message}</AppText> : <ActivityIndicator color={palette.primary} style={{ paddingVertical: space.xxl }} />
      ) : empty ? (
        <AppText tone="muted" align="center" style={{ paddingVertical: space.xxl }}>
          {t('web:report.noMatch')}
        </AppText>
      ) : (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {isTxn
            ? rows.map((r, i) => (
                <ClaimRow
                  key={r.id}
                  first={i === 0}
                  title={r.title}
                  reference={r.reference}
                  date={r.date}
                  value={r.value}
                  status={r.status}
                  categoryId={r.categoryId}
                  note={r.note}
                  onPress={r.opens ? () => router.push({ pathname: '/claim/[id]', params: { id: r.id } }) : undefined}
                />
              ))
            : bars.map((b, i) => <BarRow key={b.key} first={i === 0} view={view} rowKey={b.key} value={b.value} max={bars[0].value} note={b.note} />)}
        </Card>
      )}

      {user && isTxn && txns.hasNextPage ? (
        <Button label={t('live.report.more', { shown: rows.length, total: counted })} tone="secondary" loading={txns.isFetchingNextPage} onPress={() => txns.fetchNextPage()} />
      ) : null}
      <ReportShare view={view} />
    </Page>
  );
}
