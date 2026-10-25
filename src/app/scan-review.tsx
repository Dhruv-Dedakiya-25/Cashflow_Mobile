import { IconAdjustments, IconCheck, IconSparkles, IconUpload, IconUserCheck } from '@tabler/icons-react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { ExtractedField } from '@/api/types';
import { AppText } from '@/components/app-text';
import { LiveClaimForm } from '@/components/live-claim-form';
import { Page } from '@/components/page';
import { ReceiptPaper } from '@/components/receipt-paper';
import { Button, Card, Chips, Field, SectionHeader } from '@/components/ui';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { longDate, nameOf, vendor } from '@/lib/format';
import { computeVat } from '@/mock/data';
import { categories, units, unitsFor } from '@/mock/master';
import { resubmitClaim, sampleReading, submitClaim, useMockState, useSession, type ClaimInput } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

// Values AI reads with less confidence than this are highlighted, as AI & Document Processing sets it.
const MIN_CONFIDENCE = 80;

const stages = [
  { key: 'uploaded', icon: IconUpload },
  { key: 'normalizing', icon: IconAdjustments },
  { key: 'extracted', icon: IconSparkles },
  { key: 'verified', icon: IconUserCheck },
] as const;

export default function ScanReviewScreen() {
  return authMode === 'api' ? <LiveClaimForm /> : <DemoScanReview />;
}

/** Demo mode: every receipt reads as the sample, and the claim goes into the in-memory store. */
function DemoScanReview() {
  const params = useLocalSearchParams<{ uri?: string; sample?: string; manual?: string; claimId?: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const { claims } = useMockState();
  const { personId } = useSession();
  const editing = params.claimId ? claims.find((c) => c.id === params.claimId) : undefined;
  const reading = useMemo(() => (params.uri || params.sample ? sampleReading() : undefined), [params.uri, params.sample]);
  const [stage, setStage] = useState(reading ? 0 : 3);

  const myUnits = unitsFor(editing?.beneficiaryId ?? personId);
  const [merchant, setMerchant] = useState(editing ? (editing.payeeName ?? nameOf(vendor(editing.vendorId), 'en')) : (reading?.input.payeeName ?? ''));
  const [date, setDate] = useState(editing?.expenseDate ?? reading?.input.expenseDate ?? new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState(editing?.receiptNo ?? reading?.input.receiptNo ?? '');
  const [total, setTotal] = useState(editing ? editing.gross.toFixed(3) : reading ? reading.input.enteredAmount.toFixed(3) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? reading?.input.categoryId ?? 'cat-012');
  const [description, setDescription] = useState(editing?.description ?? '');
  const costId = editing?.costId ?? myUnits[0];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [corrected, setCorrected] = useState<Set<ExtractedField>>(new Set());

  // The document stages, as the web shows them: checked, cleaned up, read, then checked by you.
  useEffect(() => {
    if (stage >= 2) return;
    const id = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 700 : 1100);
    return () => clearTimeout(id);
  }, [stage]);

  const low = (field: ExtractedField) => {
    const c = reading?.extraction.fields[field]?.confidence;
    return c !== undefined && c < MIN_CONFIDENCE && !corrected.has(field);
  };
  const touch = (field: ExtractedField) => setCorrected((s) => new Set(s).add(field));

  const submit = () => {
    const amount = Number(total);
    const next: Record<string, string> = {};
    if (!merchant.trim()) next.merchant = t('web:claim.check.merchant');
    if (!(amount > 0) || !/^\d+(\.\d{1,3})?$/.test(total.trim())) next.total = t('web:txn.refusal.amount');
    if (!description.trim()) next.description = t('web:claim.check.purpose');
    setErrors(next);
    if (Object.keys(next).length) return;
    const input: ClaimInput = {
      beneficiaryId: editing?.beneficiaryId ?? personId,
      expenseDate: date,
      categoryId,
      payeeName: merchant.trim(),
      receiptNo: receiptNo.trim() || undefined,
      description: description.trim(),
      enteredAmount: amount,
      // Finance sets these at its step.
      vatTreatment: editing?.vatTreatment ?? 'inclusive',
      costLevel: units.find((u) => u.id === costId)!.level,
      costId,
      settlement: editing?.settlement ?? 'pettyCash',
      receiptFile: editing?.receipt?.fileName ?? (params.uri ? 'receipt-photo.jpg' : reading ? 'al-maha-846517.jpg' : undefined),
      extraction: reading?.extraction,
    };
    if (editing) {
      resubmitClaim(editing.id, input);
      router.replace({ pathname: '/scan-done', params: { id: editing.id, resent: '1' } });
    } else {
      const claim = submitClaim(input);
      router.replace({ pathname: '/scan-done', params: { id: claim.id } });
    }
  };

  const busy = stage < 2;

  return (
    <Page
      title={editing ? t('web:reimb.editTitle', { reference: editing.reference }) : t('tabs.scan')}
      footer={busy ? undefined : <Button label={editing ? t('web:reimb.action.correct') : t('web:txn.action.submitForApproval')} onPress={submit} />}>
      {reading ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.xs }}>
          {stages.map((s, i) => {
            const done = i < stage || (i === 2 && stage >= 2);
            const active = i === stage && busy;
            const IconComponent = done ? IconCheck : s.icon;
            const color = done ? palette.success : active ? palette.primary : palette.textMuted;
            return (
              <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? palette.successSoft : active ? palette.primarySoft : palette.surfaceStrong, alignItems: 'center', justifyContent: 'center' }}>
                  {active ? <ActivityIndicator size="small" color={palette.primary} /> : <IconComponent size={18} color={color} strokeWidth={2.2} />}
                </View>
                <AppText variant="caption" weight="semibold" align="center" style={{ color }} numberOfLines={1}>
                  {t(`web:scan.stage.${s.key}`)}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}

      {params.uri ? (
        <Image source={{ uri: params.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: palette.surfaceStrong }} contentFit="contain" />
      ) : reading ? (
        <View style={{ backgroundColor: palette.surfaceStrong, borderRadius: radius.lg, paddingVertical: space.xl, paddingHorizontal: space.lg }}>
          <ReceiptPaper merchant="Al Maha Petroleum" receiptNo="846517" date={reading.input.expenseDate} item="SUPER 95  86.769 L" net={computeVat(19.87, 'inclusive').net} vat={computeVat(19.87, 'inclusive').vat} gross={19.87} />
        </View>
      ) : null}

      {busy ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <ActivityIndicator color={palette.primary} />
          <AppText tone="secondary" align="center">
            {stage === 0 ? t('web:scan.working.uploaded') : t('web:scan.working.normalizing')}
          </AppText>
        </Card>
      ) : (
        <>
          {reading ? (
            <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconSparkles size={20} color={palette.primary} />
                <AppText weight="semibold" tone="primary" style={{ flex: 1 }}>
                  {t('web:scan.extractionTitle')} · {t('web:scan.aiConfidence', { confidence: Math.round(reading.extraction.confidence) })}
                </AppText>
              </View>
              <AppText variant="small" tone="secondary">
                {t('scan.sampleNote')}
              </AppText>
            </View>
          ) : (
            <AppText tone="secondary">{t('web:scan.typeIt')}</AppText>
          )}

          <Card style={{ gap: space.lg }}>
            <SectionHeader title={t('web:scan.receiptTitle')} />
            <Field label={t('web:scan.field.merchant')} value={merchant} onChangeText={(v) => { setMerchant(v); touch('merchant'); }} error={errors.merchant} warn={low('merchant')} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Field label={t('web:scan.field.expenseDate')} value={date} onChangeText={(v) => { setDate(v); touch('expenseDate'); }} hint={/^\d{4}-\d{2}-\d{2}$/.test(date) ? longDate(date, code) : undefined} warn={low('expenseDate')} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('web:scan.field.receiptNo')} value={receiptNo} onChangeText={(v) => { setReceiptNo(v); touch('receiptNo'); }} warn={low('receiptNo')} />
              </View>
            </View>
            <Field
              label={`${t('web:reimb.field.billTotal')} · OMR`}
              value={total}
              onChangeText={(v) => { setTotal(v); touch('grossAmount'); }}
              keyboardType="decimal-pad"
              error={errors.total}
              warn={low('grossAmount')}
              hint={t('web:reimb.financeDecides')}
            />
            <View style={{ gap: 6 }}>
              <AppText variant="small" weight="medium" tone="secondary">
                {t('web:scan.field.category')}
              </AppText>
              <Chips value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: nameOf(c, code) }))} />
            </View>
          </Card>

          <Card style={{ gap: space.lg }}>
            <SectionHeader title={t('scan.claimDetails')} />
            <Field label={t('web:reimb.field.description')} value={description} onChangeText={setDescription} placeholder={t('web:reimb.descriptionPlaceholder')} multiline error={errors.description} />
          </Card>
        </>
      )}
    </Page>
  );
}
