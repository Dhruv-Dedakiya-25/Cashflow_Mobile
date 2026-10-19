import { IconCircleCheck, IconCoins } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Button, Card, DetailRow, Field } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, nameOf, omr, unit } from '@/lib/format';
import type { Acknowledgement } from '@/mock/data';
import { acknowledge, useMockState } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

export default function AcknowledgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const { acks } = useMockState();
  const [remarks, setRemarks] = useState('');
  // Kept after confirming, when the store no longer lists it.
  const [confirmed, setConfirmed] = useState<Acknowledgement | null>(null);
  const ack = confirmed ?? acks.find((a) => a.id === id);

  if (!ack) {
    return (
      <Page title={t('web:ack.dialogTitle')}>
        <AppText tone="muted">{t('web:ack.refusal.already')}</AppText>
      </Page>
    );
  }

  if (confirmed) {
    return (
      <Page title={t('web:ack.dialogTitle')} footer={<Button label={t('review.backToInbox')} onPress={() => router.back()} />}>
        <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxxl }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: palette.successSoft, alignItems: 'center', justifyContent: 'center' }}>
            <IconCircleCheck size={52} color={palette.success} strokeWidth={1.6} />
          </View>
          <AppText variant="heading" weight="bold" align="center">
            {t('ack.done')}
          </AppText>
          <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
            {t('ack.doneText', { amount: omr(ack.amount, code), reference: ack.allocationReference })}
          </AppText>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={t('web:ack.dialogTitle')}
      footer={<Button label={t('web:ack.confirm')} onPress={() => { acknowledge(ack.id); setConfirmed(ack); }} />}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: palette.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
          <IconCoins size={30} color={palette.warning} />
        </View>
        <AppText variant="small" tone="secondary">
          {t('web:ack.amountReceived')}
        </AppText>
        <AppText variant="display" weight="bold" align="center" style={{ fontVariant: ['tabular-nums'] }}>
          {omr(ack.amount, code)}
        </AppText>
        <AppText tone="secondary" align="center">
          {t('web:ack.kind.topUpOf', { reference: ack.allocationReference })}
        </AppText>
      </Card>

      <Card style={{ gap: 0 }}>
        <DetailRow first label={t('web:ack.column.reference')} value={ack.reference} />
        <DetailRow label={t('web:ack.column.scope')} value={nameOf(unit(ack.unitId), code)} />
        <DetailRow label={t('web:ack.column.issued')} value={longDate(ack.paidOn, code)} />
        <DetailRow label={t('web:ack.column.payment')} value={`${t(`web:payment.method.${ack.method}`)}${ack.paymentReference ? ` · ${ack.paymentReference}` : ''}`} />
        <DetailRow label={t('web:dash.my.voucher', { voucher: '' }).trim()} value={ack.voucherNo} />
      </Card>

      <Field label={t('web:ack.remarks')} placeholder={t('web:ack.remarksPlaceholder')} value={remarks} onChangeText={setRemarks} multiline />

      <AppText variant="small" tone="secondary">
        {t('web:ack.statement')}
      </AppText>
    </Page>
  );
}
