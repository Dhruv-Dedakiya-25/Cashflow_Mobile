import { IconReceiptOff } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useClaims } from '@/api/live';
import type { RequestStatus } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { ClaimRow } from '@/components/claim-row';
import { PeriodButton, SearchField } from '@/components/filters';
import { Screen } from '@/components/screen';
import { Button, Card, Chips } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { inRange, matchesSearch, periodRange, type Period } from '@/lib/filters';
import { category, nameOf, omr, vendor } from '@/lib/format';
import { claimsFor, useMockState, useSession } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

type Filter = 'all' | 'open' | 'returned' | 'paid';
const matches: Record<Filter, (s: RequestStatus) => boolean> = {
  all: () => true,
  open: (s) => s === 'submitted' || s === 'inApproval' || s === 'approved',
  returned: (s) => s === 'returned',
  paid: (s) => s === 'paid',
};

export default function ClaimsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const { personId } = useSession();
  const { user } = useAppSession();
  const live = useClaims();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>({ preset: 'all' });
  // Search and period narrow the list first; the status chips then count and pick within it.
  const mine = useMemo(() => {
    const range = periodRange(period);
    // Live: the person's own claims and those they entered for someone else, out of all they may see.
    const all = user ? (live.data ?? []).filter((c) => c.beneficiaryId === user.employeeId || c.createdById === user.employeeId).sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc)) : claimsFor(state, personId);
    return all.filter((c) => {
      const cat = category(c.categoryId);
      const shop = vendor(c.vendorId);
      return inRange(c.expenseDate, range) && matchesSearch(search, [c.description, c.reference, c.receiptNo, c.payeeName, shop?.nameEn, shop?.nameAr, cat?.nameEn, cat?.nameAr], c.gross);
    });
  }, [state, personId, period, search, user, live.data]);
  const shown = mine.filter((c) => matches[filter](c.status));
  const count = (f: Filter) => mine.filter((c) => matches[f](c.status)).length;

  return (
    <Screen title={t('tabs.claims')} {...(user ? { onRefresh: () => live.refetch(), refreshing: live.isRefetching } : {})}>
      <SearchField value={search} onChangeText={setSearch} placeholder={t('claims.search')} />
      <Chips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('web:status.all') },
          { value: 'open', label: t('web:txn.status.inApproval'), count: count('open') },
          { value: 'returned', label: t('web:txn.status.returned'), count: count('returned') },
          { value: 'paid', label: t('web:txn.status.paid') },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText variant="small" tone="muted" style={{ flexShrink: 1 }}>
          {t('claims.summary', { count: shown.length, amount: omr(shown.reduce((s, c) => s + c.gross, 0), language.code) })}
        </AppText>
        <PeriodButton value={period} onChange={setPeriod} presets={['all', 'thisMonth', 'lastMonth', 'last3', 'last6', 'thisYear']} />
      </View>
      {user && !live.data ? (
        live.error ? (
          <Card style={{ gap: space.md }}>
            <AppText tone="secondary">{live.error.message}</AppText>
            <Button label={t('live.retry')} tone="secondary" onPress={() => live.refetch()} />
          </Card>
        ) : (
          <ActivityIndicator color={palette.primary} style={{ paddingVertical: space.xxxl }} />
        )
      ) : shown.length ? (
        <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
          {shown.map((c, i) => (
            <ClaimRow
              key={c.id}
              first={i === 0}
              title={c.description}
              reference={c.reference}
              date={c.expenseDate}
              value={c.gross}
              status={c.status}
              categoryId={c.categoryId}
              note={c.vendorId ? nameOf(vendor(c.vendorId), language.code) : c.payeeName}
              onPress={() => router.push({ pathname: '/claim/[id]', params: { id: c.id } })}
            />
          ))}
        </Card>
      ) : (
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
          <IconReceiptOff size={40} color={palette.textMuted} strokeWidth={1.5} />
          <AppText tone="muted">{t('claims.empty')}</AppText>
        </View>
      )}
    </Screen>
  );
}
