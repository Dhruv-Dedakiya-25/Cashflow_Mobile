import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { amount, monthName } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

type Series = { key: string; label: string; color: string };

/** Stacked bars, one per month, drawn to one scale, with the largest total marked. */
export function MonthBars({ months, series, height = 140 }: { months: ({ month: string } & Record<string, number | string>)[]; series: Series[]; height?: number }) {
  const palette = usePalette();
  const { language } = useLanguage();
  const totals = months.map((m) => series.reduce((t, s) => t + Number(m[s.key] ?? 0), 0));
  const max = Math.max(...totals, 1);

  return (
    <View style={{ gap: space.md }}>
      <AppText variant="caption" tone="muted">
        {amount(max, language.code)}
      </AppText>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: space.md, borderBottomWidth: 1, borderBottomColor: palette.border }}>
        {months.map((m, i) => (
          <View key={m.month} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} accessible accessibilityLabel={`${monthName(m.month, language.code)}: ${amount(totals[i], language.code)}`}>
            <View style={{ width: '70%', maxWidth: 34, height: `${(totals[i] / max) * 100}%`, minHeight: totals[i] > 0 ? 3 : 0, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden', flexDirection: 'column-reverse' }}>
              {series.map((s) => {
                const v = Number(m[s.key] ?? 0);
                return v > 0 ? <View key={s.key} style={{ flex: v, backgroundColor: s.color }} /> : null;
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {months.map((m) => (
          <AppText key={m.month} variant="caption" tone="muted" align="center" style={{ flex: 1 }}>
            {monthName(m.month, language.code)}
          </AppText>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
        {series.map((s) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <AppText variant="caption" tone="secondary">
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
