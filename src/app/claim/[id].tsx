import { IconAlertCircle, IconFileText, IconSparkles } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useClaim, useOutcomeRead } from '@/api/live';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { ApprovalPath } from '@/components/approval-path';
import { CategoryIcon } from '@/components/claim-row';
import { Page } from '@/components/page';
import { ReceiptPaper } from '@/components/receipt-paper';
import { ReceiptPhoto } from '@/components/receipt-photo';
import { Button, Card, DetailRow, SectionHeader, StatusPill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { category, dateTime, longDate, nameOf, omr, person, providerName, unit, vendor } from '@/lib/format';
import { useMockState } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { claims } = useMockState();
  const { user } = useAppSession();
  const live = useClaim(id);
  useOutcomeRead('reimbursement', live.data?.id, live.data?.status);
  const claim = user ? live.data : claims.find((c) => c.id === id);
  const code = language.code;

  if (!claim) {
    return (
      <Page title={t('tabs.claims')}>
        {user && live.isLoading ? <ActivityIndicator color={palette.primary} /> : <AppText tone="muted">{live.error?.message ?? t('web:txn.notFound')}</AppText>}
      </Page>
    );
  }

  const merchant = claim.vendorId ? nameOf(vendor(claim.vendorId), code) : (claim.payeeName ?? '');
  const lastReturn = claim.status === 'returned' ? [...claim.history].reverse().find((h) => h.action === 'returned') : undefined;

  return (
    <Page
      title={claim.reference}
      right={<StatusPill status={claim.status} />}
      footer={
        claim.status === 'returned' ? (
          <Button label={t('web:reimb.action.correct')} onPress={() => router.push({ pathname: '/scan-review', params: { claimId: claim.id } })} />
        ) : undefined
      }>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <CategoryIcon categoryId={claim.categoryId} size={52} />
        <AppText variant="display" weight="bold" align="center" style={{ fontVariant: ['tabular-nums'] }}>
          {omr(claim.gross, code)}
        </AppText>
        <AppText tone="secondary" align="center">
          {claim.description}
        </AppText>
        <AppText variant="small" tone="muted" align="center">
          {nameOf(category(claim.categoryId), code)} · {longDate(claim.expenseDate, code)}
        </AppText>
      </Card>

      {lastReturn ? (
        <View style={{ backgroundColor: palette.dangerSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm, flexDirection: 'row' }}>
          <IconAlertCircle size={22} color={palette.danger} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText weight="semibold" tone="danger">
              {t('web:txn.returnedBecause')}
            </AppText>
            <AppText>{lastReturn.comment}</AppText>
            <AppText variant="caption" tone="secondary">
              {nameOf(person(lastReturn.actorId), code)} · {dateTime(lastReturn.atUtc, code)}
            </AppText>
          </View>
        </View>
      ) : null}

      {claim.receipt ? (
        <Card>
          <SectionHeader title={t('web:reimb.field.receipt')} />
          <View style={{ paddingVertical: space.sm }}>
            {user ? <ReceiptPhoto receipt={claim.receipt} /> : <ReceiptPaper merchant={merchant} receiptNo={claim.receiptNo} date={claim.expenseDate} item={claim.description.length > 22 ? `${claim.description.slice(0, 21)}…` : claim.description} net={claim.net} vat={claim.vat} gross={claim.gross} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconFileText size={18} color={palette.textMuted} />
            <AppText variant="small" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
              {claim.receipt.fileName}
            </AppText>
          </View>
          {claim.extraction ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <IconSparkles size={18} color={palette.primary} />
              <AppText variant="small" tone="primary">
                {t('web:scan.readBy', { provider: providerName(claim.extraction.provider) })} · {t('web:scan.aiConfidence', { confidence: Math.round(claim.extraction.confidence) })}
              </AppText>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: 0 }}>
        <SectionHeader title={t('web:reimb.detailsTitle')} />
        <View style={{ height: space.sm }} />
        <DetailRow first label={t('web:claim.field.merchant')} value={merchant || '—'} />
        <DetailRow label={t('web:reimb.field.receiptNo')} value={claim.receiptNo ?? '—'} />
        <DetailRow label={t('web:claim.field.category')} value={nameOf(category(claim.categoryId), code)} />
        <DetailRow label={t('web:claim.field.chargedTo')} value={nameOf(unit(claim.costId), code)} />
        <DetailRow label={t('web:reimb.field.settlement')} value={t(`web:reimb.settlement.${claim.settlement}`)} />
        {claim.preExpenseReference ? <DetailRow label={t('web:reimb.field.preApproval')} value={claim.preExpenseReference} /> : null}
        {claim.createdById !== claim.beneficiaryId ? <DetailRow label={t('web:claim.field.enteredBy')} value={nameOf(person(claim.createdById), code)} /> : null}
        <DetailRow label={t('web:reimb.amount.net')} value={omr(claim.net, code)} />
        <DetailRow label={claim.vat ? `VAT ${claim.vatRate}%` : t('web:reimb.amount.noVat')} value={omr(claim.vat, code)} />
        <DetailRow label={t('web:reimb.amount.gross')} value={<AppText weight="bold">{omr(claim.gross, code)}</AppText>} />
        {claim.payment ? <DetailRow label={t('web:reimb.amount.paid')} value={`${claim.payment.voucherNo} · ${longDate(claim.payment.paidOn, code)}`} /> : null}
      </Card>

      <Card>
        <SectionHeader title={t('web:txn.path.title')} />
        <ApprovalPath route={claim.route} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionHeader title={t('web:txn.history.title')} />
        {[...claim.history].reverse().map((h) => (
          <View key={h.id} style={{ gap: 2, paddingVertical: space.xs }}>
            <AppText variant="small">
              <AppText variant="small" weight="semibold">
                {nameOf(person(h.actorId), code)}
              </AppText>{' '}
              {t(`web:txn.history.${h.action}`)}
            </AppText>
            {h.comment ? (
              <AppText variant="small" tone="secondary">
                “{h.comment}”
              </AppText>
            ) : null}
            <AppText variant="caption" tone="muted">
              {dateTime(h.atUtc, code)}
            </AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}
