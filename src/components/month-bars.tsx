import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { amount, monthName } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

type Series = { key: string; label: string; color: string };

/**
 * Stacked bars, one per month (or per day, for a short period), drawn to one scale, with the largest
 * total marked. `labelOf` names each bar; it may leave some blank so a month of days stays readable.
 */
export function MonthBars({ months, series, height = 140, labelOf }: { months: ({ month: string } & Record<string, number | string>)[]; series: Series[]; height?: number; labelOf?: (key: string, index: number) => string }) {
  const palette = usePalette();
  const { language } = useLanguage();
  const totals = months.map((m) => series.reduce((t, s) => t + Number(m[s.key] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const label = (key: string, i: number) => (labelOf ? labelOf(key, i) : monthName(key, language.code));
  const gap = months.length > 12 ? 2 : space.md;

  return (
    <View style={{ gap: space.md }}>
      <AppText variant="caption" tone="muted">
        {amount(max, language.code)}
      </AppText>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap, borderBottomWidth: 1, borderBottomColor: palette.border }}>
        {months.map((m, i) => (
          <View key={m.month} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} accessible accessibilityLabel={`${labelOf ? m.month : monthName(m.month, language.code)}: ${amount(totals[i], language.code)}`}>
            <View style={{ width: '70%', maxWidth: 34, height: `${(totals[i] / max) * 100}%`, minHeight: totals[i] > 0 ? 3 : 0, borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden', flexDirection: 'column-reverse' }}>
              {series.map((s) => {
                const v = Number(m[s.key] ?? 0);
                return v > 0 ? <View key={s.key} style={{ flex: v, backgroundColor: s.color }} /> : null;
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {months.map((m, i) => (
          <AppText key={m.month} variant="caption" tone="muted" align="center" style={{ flex: 1 }} numberOfLines={1}>
            {label(m.month, i)}
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
