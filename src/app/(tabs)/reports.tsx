import { IconBriefcase, IconBuildingCommunity, IconBuildingStore, IconCategory, IconListDetails, IconShare, IconUsers, type Icon } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useReport } from '@/api/live';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { PeriodButton, SearchField } from '@/components/filters';
import { MonthBars } from '@/components/month-bars';
import { ReportShare } from '@/components/report-share';
import { Screen } from '@/components/screen';
import { Button, Card, Pill, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { reportRange, setReportFilter, useReportFilter } from '@/lib/filters';
import { nameOf, omr, unit } from '@/lib/format';
import { rowKeyOf } from '@/lib/report-tables';
import { groupLines, managerScope, monthsOf, reportFor, reportPresets, rowName, type ReportView } from '@/mock/report';
import { useMockState, useSession } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

const viewIcon: Record<ReportView, Icon> = {
  category: IconCategory,
  department: IconBuildingCommunity,
  project: IconBriefcase,
  employee: IconUsers,
  vendor: IconBuildingStore,
  transactions: IconListDetails,
};

type Overview = {
  total: number;
  claims: number;
  months: { month: string; [series: string]: number | string }[];
  series: { key: string; label: string; color: string }[];
  labelOf?: (key: string, index: number) => string;
  notes: Record<ReportView, string>;
};

export default function ReportsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { persona } = useSession();
  const { user } = useAppSession();
  const { period, search } = useReportFilter();
  const [shareNote, setShareNote] = useState(false);

  // Live: the API's reports for the period and search, the five summaries at once for the tiles' notes.
  const range = reportRange(period);
  const reports = {
    category: useReport('category', range, search, !!user),
    department: useReport('department', range, search, !!user),
    project: useReport('project', range, search, !!user),
    employee: useReport('employee', range, search, !!user),
    vendor: useReport('vendor', range, search, !!user),
  };
  const sample = useMemo(() => reportFor(state.claims, persona, period, search), [state.claims, persona, period, search]);

  const topOf = (name?: string) => (name ? t('reports.top', { name }) : '—');
  const overview: Overview | undefined = user
    ? reports.category.data && {
        total: reports.category.data.totals.claimed,
        claims: reports.category.data.totals.claims,
        // The API's buckets are months, or days for a short period; every fifth day is named.
        months: reports.category.data.buckets.keys.map((k, i) => ({ month: k.length === 7 ? `${k}-01` : k, paid: reports.category.data!.trend.paid[i], pending: reports.category.data!.trend.pending[i] })),
        series: [
          { key: 'paid', label: t('web:report.column.paid'), color: palette.primary },
          { key: 'pending', label: t('web:report.column.pending'), color: palette.warning },
        ],
        labelOf: reports.category.data.buckets.unit === 'day' ? (k, i) => (i % 5 === 0 ? String(Number(k.slice(8, 10))) : '') : undefined,
        notes: {
          category: topOf(reports.category.data.rows[0] && rowName('category', rowKeyOf('category', reports.category.data.rows[0]), code)),
          department: topOf(reports.department.data?.rows[0] && rowName('department', rowKeyOf('department', reports.department.data.rows[0]), code)),
          project: topOf(reports.project.data?.rows[0] && rowName('project', rowKeyOf('project', reports.project.data.rows[0]), code)),
          employee: topOf(reports.employee.data?.rows[0] && rowName('employee', rowKeyOf('employee', reports.employee.data.rows[0]), code)),
          vendor: topOf(reports.vendor.data?.rows[0] && rowName('vendor', rowKeyOf('vendor', reports.vendor.data.rows[0]), code)),
          transactions: t('web:dash.my.claimsCount', { count: reports.category.data.totals.claims }),
        },
      }
    : {
        total: sample.lines.reduce((s, l) => s + l.gross, 0),
        claims: sample.lines.length,
        months: monthsOf(sample.lines, sample.range),
        series: [
          { key: 'pettyCash', label: t('web:dash.chart.pettyCash'), color: palette.primary },
          { key: 'salary', label: t('web:dash.chart.salary'), color: palette.teal },
        ],
        notes: Object.fromEntries(
          (Object.keys(viewIcon) as ReportView[]).map((view) => [
            view,
            view === 'transactions' ? t('web:dash.my.claimsCount', { count: sample.lines.length }) : topOf(groupLines(sample.lines, view)[0] && rowName(view, groupLines(sample.lines, view)[0].key, code)),
          ]),
        ) as Record<ReportView, string>,
      };

  const tone: Record<ReportView, string> = { category: palette.primary, department: palette.teal, project: palette.warning, employee: palette.success, vendor: palette.primary, transactions: palette.textSecondary };
  const scope = user
    ? t(user.dataScope === 'ownTeam' ? 'reports.scopeTeam' : 'reports.scopeCompany')
    : persona === 'finance'
      ? t('reports.scopeCompany')
      : managerScope.map((id) => nameOf(unit(id), code)).join(' · ');

  return (
    <Screen title={t('tabs.reports')} {...(user ? { onRefresh: () => Promise.all(Object.values(reports).map((r) => r.refetch())), refreshing: reports.category.isRefetching } : {})}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }}>
        <Pill label={scope} bg={palette.primarySoft} fg={palette.primary} />
        <PeriodButton value={period} onChange={(p) => setReportFilter({ period: p })} presets={reportPresets} />
      </View>
      <SearchField value={search} onChangeText={(s) => setReportFilter({ search: s })} placeholder={t('reports.search')} />

      {!overview ? (
        reports.category.error ? (
          <Card style={{ gap: space.md }}>
            <AppText tone="secondary">{reports.category.error.message}</AppText>
            <Button label={t('live.retry')} tone="secondary" onPress={() => reports.category.refetch()} />
          </Card>
        ) : (
          <ActivityIndicator color={palette.primary} style={{ paddingVertical: space.xxxl }} />
        )
      ) : (
        <>
          <Card style={{ gap: space.md }}>
            <View style={{ gap: 2 }}>
              <AppText variant="small" tone="secondary">
                {t('web:report.tile.claimed')}
              </AppText>
              <AppText variant="heading" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                {omr(overview.total, code)}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: space.md, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
              {[
                { label: t('web:report.tile.claims'), value: String(overview.claims), tone: palette.primary },
                { label: t('reports.average'), value: omr(overview.total / Math.max(overview.claims, 1), code), tone: palette.teal },
              ].map((tile) => (
                <View key={tile.label} style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" tone="secondary">
                    {tile.label}
                  </AppText>
                  <AppText variant="bodyLarge" weight="bold" style={{ color: tile.tone, fontVariant: ['tabular-nums'] }}>
                    {tile.value}
                  </AppText>
                </View>
              ))}
            </View>
            {!overview.claims ? (
              <AppText variant="small" tone="muted">
                {t('web:report.noMatch')}
              </AppText>
            ) : null}
          </Card>

          <Card>
            <SectionHeader title={t('web:dash.chart.trendTitle')} />
            <MonthBars months={overview.months} series={overview.series} labelOf={overview.labelOf} />
          </Card>

          <SectionHeader title={t('reports.spendingBy')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {(Object.keys(viewIcon) as ReportView[]).map((view) => {
              const ViewIcon = viewIcon[view];
              return (
                <View key={view} style={{ flexBasis: '45%', flexGrow: 1 }}>
                  <Card onPress={() => router.push({ pathname: '/report/[view]', params: { view } })} style={{ gap: space.sm, padding: space.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: `${tone[view]}1A`, alignItems: 'center', justifyContent: 'center' }}>
                      <ViewIcon size={22} color={tone[view]} strokeWidth={1.9} />
                    </View>
                    <AppText weight="semibold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {t(`web:report.column.${view}`)}
                    </AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {overview.notes[view]}
                    </AppText>
                  </Card>
                </View>
              );
            })}
          </View>
        </>
      )}

      {user ? (
        <ReportShare view="category" />
      ) : (
        <>
          <Button label={t('reports.share')} tone="secondary" icon={IconShare} onPress={() => setShareNote((v) => !v)} />
          {shareNote ? (
            <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.lg, padding: space.md }}>
              <AppText variant="small">{t('reports.shareDemo')}</AppText>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
