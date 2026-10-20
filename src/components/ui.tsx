// The small building blocks every screen uses: cards, buttons, status pills, avatars,
// segmented filters, section headers, inputs and progress bars.
import type { Icon } from '@tabler/icons-react-native';
import { useRef, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import type { RequestStatus, ThresholdBand } from '@/api/types';
import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { initials } from '@/lib/format';
import { fonts, radius, space, type, usePalette, type Palette } from '@/theme/tokens';

export function Card({ children, onPress, style, padded = true }: { children: ReactNode; onPress?: () => void; style?: ViewStyle; padded?: boolean }) {
  const palette = usePalette();
  const base: ViewStyle = {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: padded ? space.lg : 0,
    gap: space.md,
    shadowColor: palette.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, style, pressed && { backgroundColor: palette.surface }]}>
      {children}
    </Pressable>
  );
}

type ButtonTone = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export function Button({
  label, onPress, tone = 'primary', icon: IconComponent, disabled, loading, compact,
}: { label: string; onPress: () => void; tone?: ButtonTone; icon?: Icon; disabled?: boolean; loading?: boolean; compact?: boolean }) {
  const palette = usePalette();
  const colors: Record<ButtonTone, { bg: string; fg: string; border: string }> = {
    primary: { bg: palette.primary, fg: palette.onPrimary, border: palette.primary },
    secondary: { bg: palette.card, fg: palette.text, border: palette.border },
    danger: { bg: palette.dangerSoft, fg: palette.danger, border: palette.dangerSoft },
    success: { bg: palette.success, fg: palette.onPrimary, border: palette.success },
    ghost: { bg: 'transparent', fg: palette.primary, border: 'transparent' },
  };
  const c = colors[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => ({
        minHeight: compact ? 40 : 50,
        paddingHorizontal: compact ? space.md : space.xl,
        borderRadius: radius.lg,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      {loading ? <ActivityIndicator color={c.fg} /> : IconComponent ? <IconComponent size={compact ? 18 : 20} color={c.fg} strokeWidth={2} /> : null}
      <AppText weight="semibold" align="center" style={{ color: c.fg }} variant={compact ? 'small' : 'body'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const statusTone = (p: Palette, status: RequestStatus) =>
  ({
    draft: [p.surfaceStrong, p.textSecondary],
    submitted: [p.primarySoft, p.primary],
    inApproval: [p.warningSoft, p.warning],
    returned: [p.dangerSoft, p.danger],
    approved: [p.tealSoft, p.teal],
    rejected: [p.dangerSoft, p.danger],
    cancelled: [p.surfaceStrong, p.textMuted],
    disbursed: [p.warningSoft, p.warning],
    acknowledged: [p.successSoft, p.success],
    closed: [p.surfaceStrong, p.textSecondary],
    paid: [p.successSoft, p.success],
  })[status];

/** A dot-marked label in the status's colour. */
export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <AppText variant="caption" weight="semibold" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}

export function StatusPill({ status }: { status: RequestStatus }) {
  const { t } = useTranslation();
  const [bg, fg] = statusTone(usePalette(), status);
  return <Pill label={t(`web:txn.status.${status}`, { defaultValue: status })} bg={bg} fg={fg} />;
}

export const bandColor = (p: Palette, band: ThresholdBand) =>
  ({ pending: p.textMuted, normal: p.success, watch: p.warning, near: '#EA580C', exceeded: p.danger })[band];

const avatarColors = ['#2563EB', '#0F766E', '#7C3AED', '#C2410C', '#DB2777', '#0891B2', '#4D7C0F'];

export function Avatar({ name, id, size = 40 }: { name: string; id: string; size?: number }) {
  const color = avatarColors[[...id].reduce((t, ch) => t + ch.charCodeAt(0), 0) % avatarColors.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <AppText weight="bold" align="center" style={{ color, fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {initials(name)}
      </AppText>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: palette.surfaceStrong, borderRadius: radius.lg, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radius.md,
              backgroundColor: on ? palette.card : 'transparent',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 5,
              shadowColor: palette.shadow,
              shadowOpacity: on ? 0.08 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}>
            <AppText variant="small" weight={on ? 'semibold' : 'medium'} tone={on ? 'default' : 'secondary'} align="center" numberOfLines={1}>
              {o.label}
            </AppText>
            {o.count ? (
              <View style={{ backgroundColor: on ? palette.primary : palette.border, borderRadius: radius.pill, minWidth: 18, paddingHorizontal: 5 }}>
                <AppText variant="caption" weight="bold" align="center" style={{ color: on ? palette.onPrimary : palette.textSecondary, fontSize: 11 }}>
                  {o.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
      <AppText variant="bodyLarge" weight="semibold" style={{ flexShrink: 1 }}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <AppText variant="small" weight="semibold" tone="primary">
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Field({
  label, hint, error, warn, right, ref, ...input
}: TextInputProps & { label: string; hint?: string; error?: string; warn?: boolean; right?: ReactNode; ref?: Ref<TextInput> }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  const borderColor = error ? palette.danger : warn ? palette.warning : palette.border;
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="small" weight="medium" tone="secondary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor, borderRadius: radius.md, backgroundColor: warn ? palette.warningSoft : palette.card, paddingHorizontal: space.md }}>
        <TextInput
          ref={ref}
          placeholderTextColor={palette.textMuted}
          // The visible label, read out by VoiceOver and TalkBack.
          accessibilityLabel={label}
          {...input}
          style={{ flex: 1, minHeight: 46, color: palette.text, fontFamily: fonts.regular, fontSize: type.body.fontSize, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}
        />
        {right}
      </View>
      {error || hint ? (
        <AppText variant="caption" tone={error ? 'danger' : warn ? 'warning' : 'muted'}>
          {error ?? hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const palette = usePalette();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceStrong, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Label on the start side, value on the end side: one line of a record's details. */
export function DetailRow({ label, value, first }: { label: string; value: ReactNode; first?: boolean }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>
      <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>{typeof value === 'string' ? <AppText variant="small" weight="medium" align={isRTL ? 'left' : 'right'}>{value}</AppText> : value}</View>
    </View>
  );
}

/** The demo's reminder that every figure is sample data. */
export function SampleBadge() {
  const palette = usePalette();
  const { t } = useTranslation();
  return <Pill label={t('demo.sample')} bg={palette.primarySoft} fg={palette.primary} />;
}

/** A scrolling row of choices, for lists too long to share one line: categories, units, filters. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const palette = usePalette();
  const scroller = useRef<ScrollView>(null);
  // A choice already made, such as a claim's category, is brought into view once, not hidden off the edge.
  const shown = useRef(false);
  return (
    <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onLayout={(e) => {
              if (!on || shown.current) return;
              shown.current = true;
              scroller.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - space.xl), animated: false });
            }}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primarySoft : palette.card }}>
            <AppText variant="small" weight={on ? 'semibold' : 'medium'} tone={on ? 'primary' : 'secondary'}>
              {o.label}
            </AppText>
            {o.count ? (
              <View style={{ backgroundColor: on ? palette.primary : palette.surfaceStrong, borderRadius: radius.pill, minWidth: 18, paddingHorizontal: 5 }}>
                <AppText variant="caption" weight="bold" align="center" style={{ color: on ? palette.onPrimary : palette.textSecondary, fontSize: 11 }}>
                  {o.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
