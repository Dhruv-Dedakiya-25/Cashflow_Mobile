import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { AllocationLevel, AllocationPosition } from '@/api/types';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card, Chips, Pill, ProgressBar, SectionHeader, bandColor } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, nameOf, omr, person, unit } from '@/lib/format';
import { useCompany } from '@/hooks/use-company';
import { space, usePalette } from '@/theme/tokens';

function PositionRow({ p, first }: { p: AllocationPosition; first: boolean }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const color = bandColor(palette, p.band);
  return (
    <View style={{ padding: space.lg, gap: space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
          {nameOf(unit(p.scopeId), code)}
        </AppText>
        <Pill label={t(`web:allocation.band.${p.band}`)} bg={`${color}1F`} fg={color} />
      </View>
      <AppText variant="caption" tone="muted">
        {p.reference} · {t('pettyCash.heldBy', { name: nameOf(person(p.custodianId), code) })}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText variant="bodyLarge" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
          {omr(p.available, code)}
        </AppText>
        <AppText variant="small" tone="muted">
          {t('home.ofFloat', { amount: amount(p.float, code) })}
        </AppText>
      </View>
      <ProgressBar percent={p.percentLeft ?? 0} color={color} />
      <AppText variant="caption" tone="muted">
        {t('web:dash.column.used')}: {amount(p.used, code)} · {t('web:dash.column.reserved')}: {amount(p.reserved, code)}
      </AppText>
    </View>
  );
}

/** Finance's view of every allocation, grouped by what it is held for. */
export default function PettyCashScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const palette = usePalette();
  const { summary, query } = useCompany();
  const [level, setLevel] = useState<AllocationLevel | 'all'>('all');

  if (!summary) {
    return (
      <Page title={t('web:dash.finance.positionTitle')}>
        {query.error ? <AppText tone="danger">{query.error.message}</AppText> : <ActivityIndicator color={palette.primary} />}
      </Page>
    );
  }
  const { groups, positions } = summary;

  return (
    <Page title={t('web:dash.finance.positionTitle')}>
      <Chips<AllocationLevel | 'all'>
        value={level}
        onChange={setLevel}
        options={[
          { value: 'all', label: t('web:status.all'), count: positions.length },
          ...groups.map((g) => ({ value: g.level, label: t(`pettyCash.level.${g.level}`), count: g.count })),
        ]}
      />
      {groups
        .filter((g) => level === 'all' || g.level === level)
        .map((g) => (
          <View key={g.level} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <SectionHeader title={t(`pettyCash.level.${g.level}`)} />
              </View>
              <AppText variant="small" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                {amount(g.available, language.code)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('home.ofFloat', { amount: amount(g.float, language.code) })}
              </AppText>
            </View>
            <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
              {positions
                .filter((p) => p.level === g.level)
                .map((p, i) => (
                  <PositionRow key={p.id} p={p} first={i === 0} />
                ))}
            </Card>
          </View>
        ))}
    </Page>
  );
}
