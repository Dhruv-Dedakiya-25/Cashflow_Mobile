import { IconBriefcase, IconBuildingCommunity, IconBuildingStore, IconCategory, IconListDetails, IconShare, IconUsers, type Icon } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PeriodButton, SearchField } from '@/components/filters';
import { MonthBars } from '@/components/month-bars';
import { Screen } from '@/components/screen';
import { Button, Card, Pill, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { setReportFilter, useReportFilter } from '@/lib/filters';
import { nameOf, omr, unit } from '@/lib/format';
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

export default function ReportsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { persona } = useSession();
  const { period, search } = useReportFilter();
  const [shareNote, setShareNote] = useState(false);
  const { range, lines } = useMemo(() => reportFor(state.claims, persona, period, search), [state.claims, persona, period, search]);

  const total = lines.reduce((s, l) => s + l.gross, 0);
  const tone: Record<ReportView, string> = { category: palette.primary, department: palette.teal, project: palette.warning, employee: palette.success, vendor: palette.primary, transactions: palette.textSecondary };
  const note = (view: ReportView) => {
    if (view === 'transactions') return t('web:dash.my.claimsCount', { count: lines.length });
    const top = groupLines(lines, view)[0];
    return top ? t('reports.top', { name: rowName(view, top.key, code) }) : '—';
  };

  return (
    <Screen title={t('tabs.reports')} sample>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }}>
        <Pill label={persona === 'finance' ? t('reports.scopeCompany') : managerScope.map((id) => nameOf(unit(id), code)).join(' · ')} bg={palette.primarySoft} fg={palette.primary} />
        <PeriodButton value={period} onChange={(p) => setReportFilter({ period: p })} presets={reportPresets} />
      </View>
      <SearchField value={search} onChangeText={(s) => setReportFilter({ search: s })} placeholder={t('reports.search')} />

      <Card style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <AppText variant="small" tone="secondary">
            {t('web:report.tile.claimed')}
          </AppText>
          <AppText variant="heading" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
            {omr(total, code)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
          {[
            { label: t('web:report.tile.claims'), value: String(lines.length), tone: palette.primary },
            { label: t('reports.average'), value: omr(total / Math.max(lines.length, 1), code), tone: palette.teal },
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
        {!lines.length ? (
          <AppText variant="small" tone="muted">
            {t('web:report.noMatch')}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title={t('web:dash.chart.trendTitle')} />
        <MonthBars
          months={monthsOf(lines, range)}
          series={[
            { key: 'pettyCash', label: t('web:dash.chart.pettyCash'), color: palette.primary },
            { key: 'salary', label: t('web:dash.chart.salary'), color: palette.teal },
          ]}
        />
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
                <AppText weight="semibold" numberOfLines={1}>
                  {t(`web:report.column.${view}`)}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {note(view)}
                </AppText>
              </Card>
            </View>
          );
        })}
      </View>

      <Button label={t('reports.share')} tone="secondary" icon={IconShare} onPress={() => setShareNote((v) => !v)} />
      {shareNote ? (
        <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.lg, padding: space.md }}>
          <AppText variant="small">{t('reports.shareDemo')}</AppText>
        </View>
      ) : null}
    </Screen>
  );
}
