import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CategoryIcon, ClaimRow } from '@/components/claim-row';
import { PeriodButton, SearchField } from '@/components/filters';
import { Page } from '@/components/page';
import { Avatar, Card } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { setReportFilter, useReportFilter } from '@/lib/filters';
import { amount, nameOf, omr, person, unit, vendor } from '@/lib/format';
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

/** One report opened from Reports: by category, department, project, employee, merchant, or every claim. */
export default function ReportViewScreen() {
  const { view } = useLocalSearchParams<{ view: ReportView }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { persona } = useSession();
  const { period, search } = useReportFilter();
  const { lines } = useMemo(() => reportFor(state.claims, persona, period, search), [state.claims, persona, period, search]);
  const rows = view === 'transactions' ? [] : groupLines(lines, view);
  // Department and project reports count only the claims charged there.
  const counted = view === 'department' || view === 'project' ? lines.filter((l) => l.costLevel === view) : lines;
  const total = counted.reduce((s, l) => s + l.gross, 0);
  const empty = view === 'transactions' ? !lines.length : !rows.length;

  return (
    <Page title={t(`web:report.column.${view}`)}>
      <AppText variant="small" tone="secondary">
        {t(`web:report.purpose.${view}`)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText variant="small" tone="muted" style={{ flexShrink: 1 }}>
          {t('claims.summary', { count: counted.length, amount: omr(total, code) })}
        </AppText>
        <PeriodButton value={period} onChange={(p) => setReportFilter({ period: p })} presets={reportPresets} />
      </View>
      <SearchField value={search} onChangeText={(s) => setReportFilter({ search: s })} placeholder={t(view === 'transactions' ? 'reports.search' : 'web:report.search.summary')} />

      {empty ? (
        <AppText tone="muted" align="center" style={{ paddingVertical: space.xxl }}>
          {t('web:report.noMatch')}
        </AppText>
      ) : (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {view === 'transactions'
            ? lines.map((l, i) => {
                const live = state.claims.some((c) => c.id === l.id);
                return (
                  <ClaimRow
                    key={l.id}
                    first={i === 0}
                    title={l.description}
                    reference={l.reference}
                    date={l.expenseDate}
                    value={l.gross}
                    status={l.status}
                    categoryId={l.categoryId}
                    note={`${nameOf(person(l.beneficiaryId), code)} · ${l.vendorId ? nameOf(vendor(l.vendorId), code) : l.payeeName ?? nameOf(unit(l.costId), code)}`}
                    onPress={live ? () => router.push({ pathname: '/claim/[id]', params: { id: l.id } }) : undefined}
                  />
                );
              })
            : rows.map((r, i) => (
                <BarRow
                  key={r.key}
                  first={i === 0}
                  view={view}
                  rowKey={r.key}
                  value={r.amount}
                  max={rows[0].amount}
                  note={`${t('web:dash.my.claimsCount', { count: r.count })} · ${Math.round((r.amount / total) * 100)}%`}
                />
              ))}
        </Card>
      )}
    </Page>
  );
}
