import { IconArrowLeft, IconArrowRight, IconCalendar, IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconSearch, IconX } from '@tabler/icons-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { addDays, type DateRange, type Period, type PeriodPreset } from '@/lib/filters';
import { longDate, monthName, monthYear, shortDate, weekdayLetter } from '@/lib/format';
import { omanToday } from '@/mock/clock';
import { fonts, radius, space, type, usePalette } from '@/theme/tokens';

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, paddingHorizontal: space.md }}>
      <IconSearch size={18} color={palette.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        style={{ flex: 1, minHeight: 44, color: palette.text, fontFamily: fonts.regular, fontSize: type.body.fontSize, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('web:action.clearAll')}>
          <IconX size={18} color={palette.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function usePeriodLabel() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return (period: Period) => {
    if ('preset' in period) return t(`period.${period.preset}`);
    return period.from === period.to ? longDate(period.from, language.code) : `${shortDate(period.from, language.code)} – ${shortDate(period.to, language.code)}`;
  };
}

/** The period button: opens a list of ready-made periods, or a calendar for chosen dates. */
export function PeriodButton({ value, onChange, presets }: { value: Period; onChange: (p: Period) => void; presets: PeriodPreset[] }) {
  const palette = usePalette();
  const label = usePeriodLabel();
  const [open, setOpen] = useState(false);
  const active = !('preset' in value) || value.preset !== 'all';
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: space.md,
          paddingVertical: 8,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: active ? palette.primary : palette.border,
          backgroundColor: pressed ? palette.surfaceStrong : active ? palette.primarySoft : palette.card,
        })}>
        <IconCalendar size={16} color={active ? palette.primary : palette.textSecondary} />
        <AppText variant="small" weight="semibold" tone={active ? 'primary' : 'secondary'} numberOfLines={1}>
          {label(value)}
        </AppText>
        <IconChevronDown size={16} color={active ? palette.primary : palette.textSecondary} />
      </Pressable>
      {open ? <PeriodSheet value={value} presets={presets} onChange={onChange} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PeriodSheet({ value, presets, onChange, onClose }: { value: Period; presets: PeriodPreset[]; onChange: (p: Period) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const label = usePeriodLabel();
  const [choosing, setChoosing] = useState(false);
  const custom = 'preset' in value ? undefined : value;
  const choose = (p: Period) => {
    onChange(p);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', direction: isRTL ? 'rtl' : 'ltr' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.45)' }]} onPress={onClose} accessibilityLabel={t('web:action.cancel')} />
        <View style={{ backgroundColor: palette.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.sm, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg, gap: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
          {choosing ? (
            <RangeCalendar initial={custom} onApply={(r) => choose(r)} onBack={() => setChoosing(false)} />
          ) : (
            <View>
              <AppText variant="bodyLarge" weight="semibold" style={{ paddingBottom: space.sm }}>
                {t('period.title')}
              </AppText>
              {presets.map((p) => (
                <SheetRow key={p} label={t(`period.${p}`)} selected={'preset' in value && value.preset === p} onPress={() => choose({ preset: p })} />
              ))}
              <SheetRow label={t('period.custom')} note={custom ? label(custom) : undefined} selected={!!custom} chevron onPress={() => setChoosing(true)} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SheetRow({ label, note, selected, chevron, onPress }: { label: string; note?: string; selected: boolean; chevron?: boolean; onPress: () => void }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: pressed ? palette.surface : 'transparent' })}>
      <View style={{ flex: 1 }}>
        <AppText weight={selected ? 'semibold' : 'regular'} tone={selected ? 'primary' : 'default'}>
          {label}
        </AppText>
        {note ? (
          <AppText variant="caption" tone="muted">
            {note}
          </AppText>
        ) : null}
      </View>
      {selected ? <IconCheck size={20} color={palette.primary} strokeWidth={2.4} /> : null}
      {chevron ? <Chevron size={18} color={palette.textMuted} /> : null}
    </Pressable>
  );
}

/** A month or a year in the calendar's quick pickers, three to a row. */
function GridCell({ label, accessibilityLabel, on, disabled, onPress }: { label: string; accessibilityLabel?: string; on: boolean; disabled?: boolean; onPress: () => void }) {
  const palette = usePalette();
  return (
    <View style={{ width: '33.333%', paddingHorizontal: 4 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: on, disabled }}
        style={({ pressed }) => ({ height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? palette.primary : pressed ? palette.primarySoft : palette.surface, opacity: disabled ? 0.4 : 1 })}>
        <AppText weight={on ? 'bold' : 'medium'} style={{ color: on ? palette.onPrimary : palette.text, fontVariant: ['tabular-nums'] }}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

/** One month at a time: tap the first day, then the last. Days after today cannot be chosen. */
function RangeCalendar({ initial, onApply, onBack }: { initial?: DateRange; onApply: (r: DateRange) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language, isRTL } = useLanguage();
  const code = language.code;
  const today = omanToday();
  const [start, setStart] = useState(initial?.from);
  const [end, setEnd] = useState(initial?.to);
  const [month, setMonth] = useState(`${(initial?.to ?? today).slice(0, 7)}-01`);
  // The title steps from days to a year's months to a page of years; picking one steps back down.
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const thisYear = Number(today.slice(0, 4));
  // Years show twelve to a page, the newest page ending this year.
  const [lastYear, setLastYear] = useState(thisYear);

  const shiftMonth = (by: number) => {
    const d = new Date(`${month}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + by);
    setMonth(d.toISOString().slice(0, 10));
  };
  const lead = new Date(`${month}T00:00:00Z`).getUTCDay();
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells = [...Array<string | null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month, i))];
  const atLatest = month.slice(0, 7) >= today.slice(0, 7);
  const atEnd = view === 'days' ? atLatest : view === 'months' ? year >= thisYear : lastYear >= thisYear;

  const pick = (day: string) => {
    if (!start || end) {
      setStart(day);
      setEnd(undefined);
    } else if (day < start) setStart(day);
    else setEnd(day);
  };
  const Back = isRTL ? IconArrowRight : IconArrowLeft;
  const Prev = isRTL ? IconChevronRight : IconChevronLeft;
  const Next = isRTL ? IconChevronLeft : IconChevronRight;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('web:action.back')}>
          <Back size={22} color={palette.text} />
        </Pressable>
        <AppText variant="bodyLarge" weight="semibold" style={{ flex: 1 }}>
          {t('period.custom')}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => (view === 'days' ? shiftMonth(-1) : view === 'months' ? setYear((y) => y - 1) : setLastYear((y) => y - 12))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(view === 'days' ? 'period.previousMonth' : 'period.previousYear')}
          style={{ padding: 6 }}>
          <Prev size={20} color={palette.text} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (view === 'days') {
              setYear(Number(month.slice(0, 4)));
              setView('months');
            } else if (view === 'months') {
              setLastYear(thisYear - Math.floor((thisYear - year) / 12) * 12);
              setView('years');
            } else setView('months');
          }}
          accessibilityRole="button"
          accessibilityLabel={t(view === 'months' ? 'period.pickYear' : 'period.pickMonth')}
          accessibilityState={{ expanded: view !== 'days' }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: pressed || view !== 'days' ? palette.primarySoft : palette.surfaceStrong })}>
          <AppText weight="semibold" tone={view === 'days' ? 'default' : 'primary'} style={{ fontVariant: ['tabular-nums'] }}>
            {view === 'days' ? monthYear(month, code) : view === 'months' ? String(year) : `${lastYear - 11} – ${lastYear}`}
          </AppText>
          {view === 'years' ? <IconChevronUp size={16} color={palette.primary} /> : <IconChevronDown size={16} color={view === 'days' ? palette.textSecondary : palette.primary} />}
        </Pressable>
        <Pressable
          onPress={() => (view === 'days' ? shiftMonth(1) : view === 'months' ? setYear((y) => y + 1) : setLastYear((y) => y + 12))}
          disabled={atEnd}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(view === 'days' ? 'period.nextMonth' : 'period.nextYear')}
          style={{ padding: 6, opacity: atEnd ? 0.3 : 1 }}>
          <Next size={20} color={palette.text} />
        </Pressable>
      </View>

      {view === 'months' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm }}>
          {Array.from({ length: 12 }, (_, i) => {
            const first = `${year}-${String(i + 1).padStart(2, '0')}-01`;
            return (
              <GridCell
                key={first}
                label={monthName(first, code)}
                accessibilityLabel={monthYear(first, code)}
                on={first === month}
                disabled={first.slice(0, 7) > today.slice(0, 7)}
                onPress={() => {
                  setMonth(first);
                  setView('days');
                }}
              />
            );
          })}
        </View>
      ) : view === 'years' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm }}>
          {Array.from({ length: 12 }, (_, i) => lastYear - 11 + i).map((y) => (
            <GridCell
              key={y}
              label={String(y)}
              on={y === year}
              onPress={() => {
                setYear(y);
                setView('months');
              }}
            />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, d) => (
            <View key={`w${d}`} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }}>
              <AppText variant="caption" tone="muted" weight="semibold">
                {weekdayLetter(d, code)}
              </AppText>
            </View>
          ))}
          {cells.map((day, i) => {
            if (!day) return <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;
            const last = end ?? start;
            const edge = day === start || day === last;
            const between = !!start && !!end && day > start && day < end;
            const future = day > today;
            return (
              <View key={day} style={{ width: `${100 / 7}%`, height: 42, justifyContent: 'center', backgroundColor: between || (edge && start !== last && !!end) ? palette.primarySoft : 'transparent', borderTopStartRadius: day === start ? 21 : 0, borderBottomStartRadius: day === start ? 21 : 0, borderTopEndRadius: day === last ? 21 : 0, borderBottomEndRadius: day === last ? 21 : 0 }}>
                <Pressable
                  onPress={() => pick(day)}
                  disabled={future}
                  accessibilityRole="button"
                  accessibilityLabel={longDate(day, code)}
                  accessibilityState={{ selected: edge, disabled: future }}
                  style={{ alignSelf: 'center', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? palette.primary : 'transparent', borderWidth: day === today && !edge ? 1.5 : 0, borderColor: palette.primary }}>
                  <AppText variant="small" weight={edge ? 'bold' : 'medium'} style={{ color: edge ? palette.onPrimary : future ? palette.textMuted : palette.text, opacity: future ? 0.45 : 1, fontVariant: ['tabular-nums'] }}>
                    {Number(day.slice(8))}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <AppText variant="small" tone={start ? 'default' : 'muted'} align="center">
        {start ? (end && end !== start ? `${longDate(start, code)} – ${longDate(end, code)}` : longDate(start, code)) : t('period.hint')}
      </AppText>
      <Button label={t('period.apply')} disabled={!start} onPress={() => start && onApply({ from: start, to: end ?? start })} />
    </View>
  );
}
