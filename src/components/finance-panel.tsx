import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useClaimOptions } from '@/api/live';
import type { ClaimFinanceInput, CostLevel, ReimbursementView, SettlementMethod, VatTreatment } from '@/api/types';
import { AppText } from '@/components/app-text';
import { Card, Chips, DetailRow, Field, SectionHeader, Segmented } from '@/components/ui';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { nameOf, omr, unit } from '@/lib/format';
import { computeVat } from '@/mock/data';
import { units, unitsFor } from '@/mock/master';
import { space } from '@/theme/tokens';

/** Finance's choices while it reviews a claim; the amount stays as typed until it is sent. */
export type FinanceDraft = Omit<ClaimFinanceInput, 'enteredAmount'> & { amount: string };

export const financeDraftOf = (c: ReimbursementView): FinanceDraft => ({
  amount: c.enteredAmount.toFixed(3),
  vatTreatment: c.vatTreatment,
  costLevel: c.costLevel,
  costId: c.costId,
  settlement: c.settlement,
});

/** What the approval carries, or undefined while the amount is not a valid one. */
export function financeInputOf({ amount, ...rest }: FinanceDraft): ClaimFinanceInput | undefined {
  const value = Number(amount);
  return value > 0 && /^\d+(\.\d{1,3})?$/.test(amount.trim()) ? { ...rest, enteredAmount: value } : undefined;
}

const levels: CostLevel[] = ['department', 'businessUnit', 'project'];

/** The units the claimant may be charged to, as "level:id" keys: their department, business unit and projects. */
function useUnitChoices(beneficiaryId: string) {
  const options = useClaimOptions(authMode === 'api' ? beneficiaryId : undefined);
  if (authMode !== 'api') return unitsFor(beneficiaryId).map((id) => `${units.find((u) => u.id === id)!.level}:${id}`);
  return levels.flatMap((level) => options.data?.costUnits[level].map((id) => `${level}:${id}`) ?? []);
}

/**
 * What Finance settles on a claim at its step, as on the web's review: the claimant gave the bill's
 * total, and Finance sets the amount as it reads the bill, the VAT, the unit charged and how it is paid.
 */
export function FinancePanel({ claim, value, onChange, error }: { claim: ReimbursementView; value: FinanceDraft; onChange: (v: FinanceDraft) => void; error?: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const code = language.code;
  const set = (change: Partial<FinanceDraft>) => onChange({ ...value, ...change });
  const current = `${value.costLevel}:${value.costId}`;
  const choices = useUnitChoices(claim.beneficiaryId);
  // A claim against a pre-approval starts on the pre-approval's unit; Finance may still charge it elsewhere.
  const onPreApprovalUnit = claim.basis === 'preApproved' && value.costLevel === claim.costLevel && value.costId === claim.costId;
  const amounts = computeVat(Number(value.amount) > 0 ? Number(value.amount) : 0, value.vatTreatment, claim.vatRate);

  return (
    <Card style={{ gap: space.md }}>
      <SectionHeader title={t('web:approval.finance.title')} />
      <AppText variant="small" tone="secondary">
        {t('web:approval.finance.hint')}
      </AppText>

      <Field
        label={t(value.vatTreatment === 'exclusive' ? 'web:reimb.field.amountNet' : 'web:reimb.field.amount')}
        value={value.amount}
        onChangeText={(amount) => set({ amount })}
        keyboardType="decimal-pad"
        error={error}
      />

      <View style={{ gap: 6 }}>
        <AppText variant="small" weight="medium" tone="secondary">
          {t('web:reimb.field.vatTreatment')}
        </AppText>
        <Chips<VatTreatment>
          value={value.vatTreatment}
          onChange={(vatTreatment) => set({ vatTreatment })}
          options={(['inclusive', 'exclusive', 'none'] as const).map((v) => ({ value: v, label: t(`web:reimb.vat.${v}`) }))}
        />
      </View>
      <View>
        <DetailRow first label={t('web:reimb.amount.net')} value={omr(amounts.net, code)} />
        <DetailRow label={value.vatTreatment === 'none' ? t('web:reimb.amount.noVat') : t('web:reimb.vatShort', { rate: claim.vatRate })} value={omr(amounts.vat, code)} />
        <DetailRow label={t('web:reimb.amount.gross')} value={omr(amounts.gross, code)} />
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="small" weight="medium" tone="secondary">
          {t('web:claim.field.chargedTo')}
        </AppText>
        <Chips
          value={current}
          onChange={(key) => {
            const [costLevel, costId] = key.split(':') as [CostLevel, string];
            set({ costLevel, costId });
          }}
          options={[...new Set([current, ...choices])].map((key) => ({ value: key, label: nameOf(unit(key.split(':')[1]), code) }))}
        />
        {onPreApprovalUnit ? (
          <AppText variant="caption" tone="muted">
            {t('web:reimb.costFromPreApproval')}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="small" weight="medium" tone="secondary">
          {t('web:reimb.field.settlement')}
        </AppText>
        <Segmented<SettlementMethod>
          value={value.settlement}
          onChange={(settlement) => set({ settlement })}
          options={[
            { value: 'pettyCash', label: t('web:reimb.settlement.pettyCash') },
            { value: 'salary', label: t('web:reimb.settlement.salary') },
          ]}
        />
        <AppText variant="caption" tone="muted">
          {t(value.settlement === 'pettyCash' ? 'web:reimb.settlement.pettyCashHint' : 'web:reimb.settlement.salaryHint')}
        </AppText>
      </View>
    </Card>
  );
}
