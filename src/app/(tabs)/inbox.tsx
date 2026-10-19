import { IconCircleCheck, IconCoins, IconUserShare } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { ApprovalItem } from '@/api/types';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Avatar, Card, Pill, Segmented } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, nameOf, person, shortDate, sinceParts, unit } from '@/lib/format';
import { acksFor, inboxFor, isItemOverdue, useMockState, useSession } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

type Tab = 'decide' | 'acknowledge';

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
          {overdue ? <Pill label={t('web:txn.path.overdue')} bg={palette.dangerSoft} fg={palette.danger} /> : null}
          {since ? (
            <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
              {t('inbox.submitted', { time: t(`web:approval.${since.unit}`, { count: since.count }) })}
            </AppText>
          ) : null}
          {item.flags.includes('onBehalf') ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconUserShare size={14} color={palette.warning} />
              <AppText variant="caption" tone="warning">
                {t('web:approval.flag.onBehalf')}
              </AppText>
            </View>
          ) : null}
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
  const [tab, setTab] = useState<Tab>(params.tab === 'acknowledge' ? 'acknowledge' : 'decide');
  const items = useMemo(() => inboxFor(state, personId), [state, personId]);
  const acks = useMemo(() => acksFor(state, personId), [state, personId]);

  return (
    <Screen title={t('tabs.inbox')}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'decide', label: t('inbox.toDecide'), count: items.length },
          { value: 'acknowledge', label: t('inbox.toAcknowledge'), count: acks.length },
        ]}
      />

      {tab === 'decide' ? (
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
                <AppText weight="semibold">{t('web:ack.kind.topUpOf', { reference: a.allocationReference })}</AppText>
                <AppText variant="small" tone="secondary">
                  {nameOf(unit(a.unitId), language.code)} · {a.reference}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('ack.paidOn', { date: shortDate(a.paidOn, language.code) })} · {t(`web:payment.method.${a.method}`)}
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
