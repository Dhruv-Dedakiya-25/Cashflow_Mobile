import { IconAlertTriangle, IconChevronLeft, IconChevronRight, IconClock, IconCoins, IconInbox } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClaimRow } from '@/components/claim-row';
import { MonthBars } from '@/components/month-bars';
import { Screen } from '@/components/screen';
import { Avatar, Card, Pill, ProgressBar, SectionHeader, bandColor } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, nameOf, omr, person, unit } from '@/lib/format';
import { financeSummary, myDashboard, useMockState, useSession } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

function greetingKey(hour: number) {
  if (hour < 12) return 'home.morning';
  if (hour < 17) return 'home.afternoon';
  return 'home.evening';
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'warning' | 'danger' | 'primary' }) {
  const palette = usePalette();
  const accent = tone === 'warning' ? palette.warning : tone === 'danger' ? palette.danger : tone === 'primary' ? palette.primary : palette.text;
  return (
    <Card style={{ flex: 1, gap: 4, padding: space.md }}>
      <AppText variant="caption" tone="secondary" numberOfLines={2}>
        {label}
      </AppText>
      <AppText variant="title" weight="bold" style={{ color: accent, fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {note}
      </AppText>
    </Card>
  );
}

function ActionRow({ icon: IconComponent, title, note, tone, onPress }: { icon: typeof IconInbox; title: string; note: string; tone: string; onPress: () => void }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: `${tone}1A`, alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent size={22} color={tone} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="semibold">{title}</AppText>
        <AppText variant="small" tone="secondary">
          {note}
        </AppText>
      </View>
      <Chevron size={20} color={palette.textMuted} />
    </Card>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language, isRTL } = useLanguage();
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;
  const state = useMockState();
  const { personId, persona } = useSession();
  const me = person(personId)!;
  const dash = useMemo(() => myDashboard(state, personId), [state, personId]);
  const finance = useMemo(() => (persona === 'finance' ? financeSummary(state) : undefined), [state, persona]);
  const now = new Date();
  const today = new Intl.DateTimeFormat(`${language.code}-u-nu-latn`, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const firstName = nameOf(me, language.code).split(' ')[0];

  return (
    <Screen
      eyebrow={today}
      title={t('home.hello', { greeting: t(greetingKey(now.getHours())), name: firstName })}
      subtitle={t('home.subtitle')}
      action={
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')} hitSlop={8}>
          <Avatar name={me.nameEn} id={me.id} size={46} />
        </Pressable>
      }>
      {/* Paid this month */}
      <View style={{ backgroundColor: palette.summary, borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', end: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: palette.summaryAccent }} />
        <AppText variant="small" weight="medium" style={{ color: palette.summaryMuted }}>
          {t('web:dash.my.tile.paid')}
        </AppText>
        <AppText variant="display" weight="bold" style={{ color: palette.summaryText, fontVariant: ['tabular-nums'] }}>
          {omr(dash.paidThisMonth, language.code)}
        </AppText>
        <AppText variant="small" style={{ color: palette.summaryMuted }}>
          {t('web:dash.my.tile.paidNote', { count: dash.paidThisMonthCount })}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Tile label={t('web:dash.my.tile.awaiting')} value={String(dash.awaitingCount)} note={omr(dash.awaitingAmount, language.code)} tone="warning" />
        <Tile
          label={t('web:dash.my.tile.returned')}
          value={String(dash.returnedCount)}
          note={dash.returnedCount ? t('web:dash.my.tile.returnedNote') : t('web:dash.my.tile.nothingReturned')}
          tone={dash.returnedCount ? 'danger' : undefined}
        />
      </View>

      {dash.approvals && dash.approvals.total > 0 ? (
        <ActionRow
          icon={IconInbox}
          tone={palette.primary}
          title={t('web:dash.my.decisionsTitle', { count: dash.approvals.total })}
          note={dash.approvals.overdue ? t('web:dash.my.overdue', { count: dash.approvals.overdue }) : t('web:dash.my.openInbox')}
          onPress={() => router.navigate('/inbox')}
        />
      ) : null}

      {dash.toAcknowledge.length ? (
        <ActionRow
          icon={IconCoins}
          tone={palette.warning}
          title={t('web:dash.my.toAcknowledge', { count: dash.toAcknowledge.length })}
          note={omr(dash.toAcknowledge.reduce((s, a) => s + a.amount, 0), language.code)}
          onPress={() => router.navigate({ pathname: '/inbox', params: { tab: 'acknowledge' } })}
        />
      ) : null}

      {finance ? (
        <Card onPress={() => router.push('/petty-cash')}>
          <AppText variant="small" weight="semibold" tone="secondary">
            {t('home.company')}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' }}>
            <AppText variant="heading" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
              {omr(finance.available, language.code)}
            </AppText>
            <AppText variant="small" tone="muted">
              {t('home.ofFloats', { amount: amount(finance.floats, language.code), count: state.positions.length })}
            </AppText>
          </View>
          <ProgressBar percent={finance.availablePercent ?? 0} color={palette.success} />
          <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconClock size={16} color={palette.warning} />
              <AppText variant="small" tone="secondary">
                {t('web:dash.attention.toPay', { count: finance.toPayCount })} · {amount(finance.toPayAmount, language.code)}
              </AppText>
            </View>
          </View>
          <View style={{ gap: space.md, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
            {finance.groups.map((g) => (
              <View key={g.level} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                  <AppText variant="small" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {t(`pettyCash.level.${g.level}`)} ({g.count})
                  </AppText>
                  <AppText variant="small" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                    {amount(g.available, language.code)}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                    {t('home.ofFloat', { amount: amount(g.float, language.code) })}
                  </AppText>
                </View>
                <ProgressBar percent={(g.available / g.float) * 100} color={palette.primary} />
              </View>
            ))}
          </View>
          {finance.attention.length ? (
            <View style={{ gap: space.sm, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
              <AppText variant="small" weight="semibold">
                {t('web:dash.finance.attentionTitle', { count: finance.attention.length })}
              </AppText>
              {finance.attention.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <IconAlertTriangle size={16} color={bandColor(palette, p.band)} />
                  <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                    {p.reference} · {nameOf(unit(p.scopeId), language.code)}
                  </AppText>
                  <AppText variant="small" weight="semibold" style={{ color: bandColor(palette, p.band) }}>
                    {p.percentLeft}%
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.md }}>
            <AppText variant="small" weight="semibold" tone="primary" style={{ flex: 1 }}>
              {t('home.seeAll')}
            </AppText>
            <Chevron size={18} color={palette.primary} />
          </View>
        </Card>
      ) : null}

      {dash.custodian.map(({ position: p }) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <AppText variant="small" weight="semibold" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              {t('web:dash.my.custodianTitle', { unit: nameOf(unit(p.scopeId), language.code) })}
            </AppText>
            <Pill label={t(`web:allocation.band.${p.band}`)} bg={`${bandColor(palette, p.band)}1F`} fg={bandColor(palette, p.band)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' }}>
            <AppText variant="heading" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
              {omr(p.available, language.code)}
            </AppText>
            <AppText variant="small" tone="muted">
              {t('home.ofFloat', { amount: amount(p.float, language.code) })}
            </AppText>
          </View>
          <ProgressBar percent={p.percentLeft ?? 0} color={bandColor(palette, p.band)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <AppText variant="caption" tone="muted">
              {p.reference}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('web:dash.column.used')}: {amount(p.used, language.code)} · {t('web:dash.column.reserved')}: {amount(p.reserved, language.code)}
            </AppText>
          </View>
        </Card>
      ))}

      <Card>
        <SectionHeader title={t('web:dash.my.monthTitle')} />
        <MonthBars
          months={dash.months}
          series={[
            { key: 'pettyCash', label: t('web:dash.chart.pettyCash'), color: palette.primary },
            { key: 'salary', label: t('web:dash.chart.salary'), color: palette.teal },
            { key: 'pending', label: t('home.pending'), color: palette.warning },
          ]}
        />
      </Card>

      <View style={{ gap: space.md }}>
        <SectionHeader title={t('web:dash.my.recentTitle')} action={t('web:dash.my.allClaims')} onAction={() => router.navigate('/claims')} />
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {dash.recent.length ? (
            dash.recent.map((r, i) => (
              <ClaimRow
                key={r.id}
                first={i === 0}
                title={r.purpose}
                reference={r.reference}
                date={r.date}
                value={r.amount}
                status={r.status}
                categoryId={state.claims.find((c) => c.id === r.id)?.categoryId}
                onPress={() => router.push({ pathname: '/claim/[id]', params: { id: r.id } })}
              />
            ))
          ) : (
            <AppText tone="muted" style={{ padding: space.lg }}>
              {t('web:dash.my.noRequests')}
            </AppText>
          )}
        </Card>
      </View>
    </Screen>
  );
}
