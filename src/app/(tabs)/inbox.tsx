import { IconAlertTriangle, IconCircleCheck, IconCoins, IconCopy, IconPencil, IconSparkles, IconUserShare, type Icon } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ackTitle, holds, toAckView, useAcknowledgements, useInbox, type AckView } from '@/api/live';
import type { ApprovalFlag, ApprovalItem } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Avatar, Button, Card, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, nameOf, person, shortDate, sinceParts, unit } from '@/lib/format';
import { acksFor, inboxFor, isItemOverdue, useMockState, useSession } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

type Tab = 'decide' | 'acknowledge';

// What the approver should look at closely, as the web's inbox flags it.
const flagIcons: Record<ApprovalFlag, Icon> = {
  changed: IconPencil,
  duplicate: IconCopy,
  overAvailable: IconAlertTriangle,
  onBehalf: IconUserShare,
  lowConfidence: IconSparkles,
};

function ApprovalRow({ item, first }: { item: ApprovalItem; first: boolean }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const who = person(item.personId)!;
  const overdue = isItemOverdue(item);
  const since = item.submittedAtUtc ? sinceParts(item.submittedAtUtc) : undefined;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/review/[kind]/[id]', params: { kind: item.kind, id: item.id } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border, backgroundColor: pressed ? palette.surface : 'transparent' })}>
      <Avatar name={who.nameEn} id={who.id} size={44} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
            {nameOf(who, language.code)}
          </AppText>
          <AppText weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
            {amount(item.amount, language.code)}
          </AppText>
        </View>
        <AppText variant="small" tone="secondary" numberOfLines={2}>
          {item.purpose}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          <Pill label={t(`web:approval.kind.${item.kind}`)} bg={palette.surfaceStrong} fg={palette.textSecondary} />
          <AppText variant="caption" tone="muted">
            {item.reference} · {nameOf(unit(item.unitId), language.code)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          {item.outcomeUnread ? <Pill label={t(`web:txn.status.${item.status}`)} bg={palette.warningSoft} fg={palette.warning} /> : null}
          {overdue ? <Pill label={t('web:txn.path.overdue')} bg={palette.dangerSoft} fg={palette.danger} /> : null}
          {since ? (
            <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
              {t('inbox.submitted', { time: t(`web:approval.${since.unit}`, { count: since.count }) })}
            </AppText>
          ) : null}
          {item.flags.map((flag) => {
            const FlagIcon = flagIcons[flag] ?? IconAlertTriangle;
            return (
              <View key={flag} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FlagIcon size={14} color={palette.warning} />
                <AppText variant="caption" tone="warning">
                  {t(`web:approval.flag.${flag}`)}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const state = useMockState();
  const { personId } = useSession();
  const { user } = useAppSession();
  const inbox = useInbox();
  // A role that does not acknowledge (an employee) has no For Acknowledgement tab: its cash counts when paid.
  const acknowledges = !user || holds(user, 'Acknowledgements', 'acknowledge');
  const ackQuery = useAcknowledgements(acknowledges);
  const [tab, setTab] = useState<Tab>(acknowledges && params.tab === 'acknowledge' ? 'acknowledge' : 'decide');
  // Live: of everything the person has been part of, what waits for their decision now, overdue first,
  // and the cash paid to them that they have not confirmed yet.
  const items = useMemo(
    () =>
      user
        ? (inbox.data ?? []).filter((i) => i.canDecide || i.outcomeUnread).sort((a, b) => Number(isItemOverdue(b)) - Number(isItemOverdue(a)) || (a.submittedAtUtc ?? '').localeCompare(b.submittedAtUtc ?? ''))
        : inboxFor(state, personId),
    [user, inbox.data, state, personId],
  );
  const acks: AckView[] = useMemo(
    () => (user ? (ackQuery.data ?? []).filter((a) => a.recipientId === user.employeeId && !a.acknowledgement).map(toAckView) : acksFor(state, personId)),
    [user, ackQuery.data, state, personId],
  );
  const failed = user ? (inbox.error ?? ackQuery.error) : null;
  const loading = user && (!inbox.data || (acknowledges && !ackQuery.data));

  return (
    <Screen title={t('tabs.inbox')} {...(user ? { onRefresh: () => Promise.all([inbox.refetch(), ackQuery.refetch()]), refreshing: inbox.isRefetching || ackQuery.isRefetching } : {})}>
      {acknowledges ? (
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'decide', label: t('web:approval.view.waiting'), count: items.length },
            { value: 'acknowledge', label: t('web:approval.view.cash'), count: acks.length },
          ]}
        />
      ) : null}

      {loading ? (
        failed ? (
          <Card style={{ gap: space.md }}>
            <AppText tone="secondary">{failed.message}</AppText>
            <Button label={t('live.retry')} tone="secondary" onPress={() => Promise.all([inbox.refetch(), ackQuery.refetch()])} />
          </Card>
        ) : (
          <ActivityIndicator color={palette.primary} style={{ paddingVertical: space.xxxl }} />
        )
      ) : tab === 'decide' ? (
        items.length ? (
          <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
            {items.map((item, i) => (
              <ApprovalRow key={`${item.kind}-${item.id}`} item={item} first={i === 0} />
            ))}
          </Card>
        ) : (
          <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
            <IconCircleCheck size={44} color={palette.success} strokeWidth={1.5} />
            <AppText tone="muted" align="center">
              {t('web:approval.empty.waiting')}
            </AppText>
          </View>
        )
      ) : acks.length ? (
        <View style={{ gap: space.md }}>
          <AppText variant="small" tone="secondary">
            {t('web:ack.bannerHint')}
          </AppText>
          {acks.map((a) => (
            <Card key={a.id} onPress={() => router.push({ pathname: '/acknowledge/[id]', params: { id: a.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.lg, backgroundColor: palette.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
                <IconCoins size={24} color={palette.warning} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="semibold">{ackTitle(t, a)}</AppText>
                <AppText variant="small" tone="secondary">
                  {nameOf(unit(a.unitId), language.code)} · {a.reference}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('ack.paidOn', { date: shortDate(a.paidOn, language.code) })}
                  {a.method ? ` · ${t(`web:payment.method.${a.method}`)}` : ''}
                </AppText>
              </View>
              <AppText weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                {amount(a.amount, language.code)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
          <IconCircleCheck size={44} color={palette.success} strokeWidth={1.5} />
          <AppText tone="muted" align="center">
            {t('web:ack.bannerNone')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}
