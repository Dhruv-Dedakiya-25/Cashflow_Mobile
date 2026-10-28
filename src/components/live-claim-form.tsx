import { IconAdjustments, IconAlertTriangle, IconCamera, IconCheck, IconFileTypePdf, IconPhoto, IconSparkles, IconUpload, IconUserCheck } from '@tabler/icons-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { ApiError, type PhoneFile } from '@/api/client';
import { asReceipt, readReceipt, submitClaim, uploadReceipt, useClaim, useClaimOptions, useDocumentOptions } from '@/api/live';
import type { AttachmentInfo, ClaimInput, ClaimOptions, DocumentOptions, ExtractedField, ReceiptExtraction, ReimbursementView } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { usePhotoEditor } from '@/components/photo-editor';
import { isPhoto, ReceiptPhoto } from '@/components/receipt-photo';
import { Button, Card, Chips, Field, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, categoryChoices, longDate, nameOf, payeeOf, providerName, vendor } from '@/lib/format';
import { omanToday } from '@/mock/clock';
import { radius, space, usePalette } from '@/theme/tokens';

/** Photos are sent at most this wide: sharp enough to read, small enough for a phone's link. */
const MAX_WIDTH = 1600;

type Params = { uri?: string; width?: string; pdf?: string; name?: string; size?: string; claimId?: string };
/** A receipt picked on the phone: a photo (with its width) or a PDF (with its name and size). */
type Source = { uri?: string; width?: string | number; pdf?: string; name?: string; size?: string | number };
type Stage = 'preparing' | 'uploading' | 'reading' | 'review';
type AiNote = { key: string } | { message: string };

const stages = [
  { key: 'normalizing', icon: IconAdjustments },
  { key: 'uploaded', icon: IconUpload },
  { key: 'extracted', icon: IconSparkles },
  { key: 'verified', icon: IconUserCheck },
] as const;
const stageIndex: Record<Stage, number> = { preparing: 0, uploading: 1, reading: 2, review: 3 };

/** The receipt made ready to upload: a photo as a JPEG at most MAX_WIDTH wide (an iPhone's HEIC included), a PDF as it is. */
async function prepare(source: Source, maxUploadMb: number, tooLarge: string): Promise<PhoneFile> {
  if (source.uri) {
    const context = ImageManipulator.manipulate(source.uri);
    if (Number(source.width) > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
    const photo = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
    return { uri: photo.uri, name: `receipt-${Date.now()}.jpg`, type: 'image/jpeg' };
  }
  if (Number(source.size) > maxUploadMb * 1024 * 1024) throw new Error(tooLarge);
  return { uri: source.pdf!, name: source.name || 'receipt.pdf', type: 'application/pdf' };
}

/**
 * Live mode's Submit Bill and Correct and Resubmit: the receipt is made ready, uploaded and read
 * by AI, then the person checks every value and sends the claim. Waits for what the form needs
 * first: the claim being corrected, where the person may charge, and the upload rules.
 */
export function LiveClaimForm() {
  const params = useLocalSearchParams<Params>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { user } = useAppSession();
  const editingQuery = useClaim(params.claimId ?? '');
  const editing = params.claimId ? editingQuery.data : undefined;
  const beneficiaryId = editing?.beneficiaryId ?? user?.employeeId;
  const options = useClaimOptions(beneficiaryId, params.claimId);
  const documents = useDocumentOptions();
  const failed = options.error ?? documents.error ?? editingQuery.error;

  if (user && !user.employeeId) {
    return (
      <Page title={t('tabs.scan')}>
        <AppText tone="secondary">{t('live.claim.noEmployee')}</AppText>
      </Page>
    );
  }
  if (!options.data || !documents.data || (params.claimId && !editing) || !beneficiaryId) {
    return (
      <Page title={t('tabs.scan')}>
        {failed ? <AppText tone="danger">{failed.message}</AppText> : <ActivityIndicator color={palette.primary} />}
      </Page>
    );
  }
  return <ClaimForm params={params} options={options.data} documents={documents.data} editing={editing} beneficiaryId={beneficiaryId} />;
}

function ClaimForm({ params, options, documents, editing, beneficiaryId }: { params: Params; options: ClaimOptions; documents: DocumentOptions; editing?: ReimbursementView; beneficiaryId: string }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const hasFile = !!(params.uri || params.pdf);
  const { edit, editor } = usePhotoEditor();

  const [stage, setStage] = useState<Stage>(hasFile ? 'preparing' : 'review');
  const [receipt, setReceipt] = useState<AttachmentInfo | undefined>(editing?.receipt);
  const [extraction, setExtraction] = useState<ReceiptExtraction>();
  const [aiNote, setAiNote] = useState<AiNote>();
  const [fileError, setFileError] = useState<string>();

  const [merchant, setMerchant] = useState(editing ? (editing.vendorId ? nameOf(vendor(editing.vendorId), code) : editing.payeeName ?? '') : '');
  const [date, setDate] = useState(editing?.expenseDate ?? omanToday());
  const [receiptNo, setReceiptNo] = useState(editing?.receiptNo ?? '');
  const [total, setTotal] = useState(editing ? editing.enteredAmount.toFixed(3) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [preApprovalId, setPreApprovalId] = useState(editing?.preExpenseId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [corrected, setCorrected] = useState<Set<ExtractedField>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [attaching, setAttaching] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  // The receipt's journey: a photo made a JPEG at most MAX_WIDTH wide (an iPhone's HEIC included),
  // uploaded, then read by AI when it is switched on. A PDF is stored as it is; AI reads photos only.
  useEffect(() => {
    if (!hasFile) return;
    let active = true;
    (async () => {
      try {
        const file = await prepare(params, documents.maxUploadMb, t('live.claim.tooLarge', { mb: documents.maxUploadMb }));
        if (!active) return;
        setStage('uploading');
        const stored = await uploadReceipt(file);
        if (!active) return;
        setReceipt(asReceipt(stored));

        if (!documents.extractionEnabled || stored.contentType !== 'image/jpeg') {
          setAiNote({ key: documents.extractionEnabled ? 'web:scan.aiPhotoOnly' : 'web:scan.aiOff' });
          setStage('review');
          return;
        }
        setStage('reading');
        try {
          const read = await readReceipt(stored.id, documents);
          if (!active) return;
          const f = read.fields;
          setExtraction(read);
          if (f.merchant?.value) setMerchant(f.merchant.value);
          if (f.expenseDate?.value) setDate(f.expenseDate.value.slice(0, 10));
          if (f.receiptNo?.value) setReceiptNo(f.receiptNo.value);
          if (f.grossAmount?.value && Number(f.grossAmount.value) > 0) setTotal(Number(f.grossAmount.value).toFixed(3));
          if (read.categoryId) setCategoryId(read.categoryId);
          if (!Object.keys(f).length) setAiNote({ key: 'web:scan.aiUnclear' });
        } catch (e) {
          // The server words a busy model, a rate limit or a model that is gone (409); anything else is "unreachable".
          if (active) setAiNote(e instanceof ApiError && e.status === 409 ? { message: e.message } : { key: 'web:scan.aiUnreachable' });
        }
        if (active) setStage('review');
      } catch (e) {
        if (!active) return;
        setFileError((e as Error).message);
        setStage('review');
      }
    })();
    return () => {
      active = false;
    };
    // The journey runs once, for the receipt this screen opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual entry and corrections attach the bill here. It is stored as it is: AI does not read over what was typed.
  const attach = async (pick: () => Promise<Source | undefined>) => {
    setFileError(undefined);
    try {
      const source = await pick();
      if (!source) return;
      setAttaching(true);
      setReceipt(asReceipt(await uploadReceipt(await prepare(source, documents.maxUploadMb, t('live.claim.tooLarge', { mb: documents.maxUploadMb })))));
      setErrors((e) => ({ ...e, receipt: '' }));
    } catch (e) {
      setFileError((e as Error).message);
    } finally {
      setAttaching(false);
    }
  };
  // A photo is cropped and turned first; Retake picks again, Cancel attaches nothing.
  const photoOf = async (launch: () => Promise<ImagePicker.ImagePickerResult>): Promise<Source | undefined> => {
    const photo = await edit(async () => {
      const r = await launch();
      return r.canceled ? undefined : r.assets[0];
    });
    return photo && { uri: photo.uri, width: photo.width };
  };
  const takePhoto = () =>
    attach(async () => {
      if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setCameraDenied(true);
        return undefined;
      }
      return photoOf(() => ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] }));
    });
  const choosePhoto = () => attach(() => photoOf(() => ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] })));
  const choosePdf = () =>
    attach(async () => {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      return r.canceled ? undefined : { pdf: r.assets[0].uri, name: r.assets[0].name, size: r.assets[0].size ?? 0 };
    });

  const low = (field: ExtractedField) => {
    const c = extraction?.fields[field]?.confidence;
    return c !== undefined && c < documents.minConfidence && !corrected.has(field);
  };
  const touch = (field: ExtractedField) => setCorrected((s) => new Set(s).add(field));

  const preApproval = options.preApprovals.find((p) => p.id === preApprovalId);
  const receiptNeeded = options.requireReceipt || options.receiptCategoryIds.includes(categoryId);

  const send = async () => {
    const value = Number(total);
    const next: Record<string, string> = {};
    if (!merchant.trim()) next.merchant = t('web:claim.check.merchant');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = t('web:reimb.check.expenseDate');
    else if (date > omanToday()) next.date = t('web:reimb.check.futureDate');
    if (!(value > 0) || !/^\d+(\.\d{1,3})?$/.test(total.trim())) next.total = t('web:txn.refusal.amount');
    if (!categoryId) next.category = t('live.claim.chooseCategory');
    if (!description.trim()) next.description = t('web:claim.check.purpose');
    if (receiptNeeded && !receipt) next.receipt = t('web:reimb.check.receiptRequired');
    if (preApproval && value > preApproval.remaining) next.total = t('web:reimb.check.overPreApproval', { remaining: amount(preApproval.remaining, code) });
    setErrors(next);
    if (Object.keys(next).length) return setSendError(t('web:reimb.check.fixFields'));

    const input: ClaimInput = {
      beneficiaryId,
      basis: preApproval ? 'preApproved' : 'direct',
      preExpenseId: preApproval?.id,
      expenseDate: date,
      categoryId,
      ...payeeOf(merchant),
      receiptNo: receiptNo.trim() || undefined,
      description: description.trim(),
      enteredAmount: value,
      // Finance sets these at its step; the server starts every claim on them whatever is sent.
      vatTreatment: 'inclusive',
      costLevel: preApproval?.costLevel ?? 'department',
      costId: preApproval?.costId ?? options.costUnits.department[0],
      settlement: 'pettyCash',
      receipt,
    };
    setSending(true);
    setSendError(undefined);
    try {
      const saved = await submitClaim(input, editing);
      router.replace({ pathname: '/scan-done', params: { id: saved.id, ...(editing ? { resent: '1' } : {}) } });
    } catch (e) {
      setSendError((e as Error).message);
      setSending(false);
    }
  };

  const working = stage !== 'review';
  const workingText = stage === 'preparing' ? 'web:scan.working.normalizing' : stage === 'uploading' ? 'web:scan.working.uploaded' : 'live.claim.reading';

  return (
    <Page
      title={editing ? t('web:reimb.editTitle', { reference: editing.reference }) : t('tabs.scan')}
      footer={
        working ? undefined : (
          <View style={{ gap: space.sm }}>
            {sendError ? <AppText tone="danger">{sendError}</AppText> : null}
            <Button label={editing ? t('web:reimb.action.correct') : t('web:txn.action.submitForApproval')} loading={sending} onPress={send} />
          </View>
        )
      }>
      {hasFile ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.xs }}>
          {stages.map((s, i) => {
            const done = i < stageIndex[stage] || (i === 3 && !working);
            const active = i === stageIndex[stage] && working;
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
      ) : isPhoto(receipt) ? (
        <ReceiptPhoto receipt={receipt!} />
      ) : params.pdf || receipt ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconFileTypePdf size={28} color={palette.danger} />
          <AppText weight="medium" style={{ flex: 1 }} numberOfLines={1}>
            {params.name || receipt?.fileName}
          </AppText>
        </Card>
      ) : null}

      {fileError && hasFile ? <AppText tone="danger">{fileError}</AppText> : null}

      {working ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <ActivityIndicator color={palette.primary} />
          <AppText tone="secondary" align="center">
            {t(workingText)}
          </AppText>
        </Card>
      ) : (
        <>
          {extraction ? (
            <View style={{ backgroundColor: palette.primarySoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconSparkles size={20} color={palette.primary} />
                <AppText weight="semibold" tone="primary" style={{ flex: 1 }}>
                  {t('web:scan.readBy', { provider: providerName(extraction.provider) })} · {t('web:scan.aiConfidence', { confidence: Math.round(extraction.confidence) })}
                </AppText>
              </View>
              <AppText variant="small" tone="secondary">
                {t('live.claim.checkEach', { min: documents.minConfidence })}
              </AppText>
            </View>
          ) : aiNote ? (
            <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: palette.warningSoft, borderRadius: radius.lg, padding: space.md }}>
              <IconAlertTriangle size={20} color={palette.warning} />
              <AppText variant="small" style={{ flex: 1 }}>
                {'message' in aiNote ? aiNote.message : t(aiNote.key)}
              </AppText>
            </View>
          ) : !editing ? (
            <AppText tone="secondary">{t('web:scan.typeIt')}</AppText>
          ) : null}

          <Card style={{ gap: space.lg }}>
            <SectionHeader title={t('web:scan.receiptTitle')} />
            <Field label={t('web:claim.field.merchant')} value={merchant} onChangeText={(v) => { setMerchant(v); touch('merchant'); }} error={errors.merchant} warn={low('merchant')} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('web:reimb.field.expenseDate')}
                  value={date}
                  onChangeText={(v) => { setDate(v); touch('expenseDate'); }}
                  error={errors.date}
                  hint={!errors.date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? longDate(date, code) : undefined}
                  warn={low('expenseDate')}
                  keyboardType="numbers-and-punctuation"
                  placeholder="2026-10-19"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('web:reimb.field.receiptNo')} value={receiptNo} onChangeText={(v) => { setReceiptNo(v); touch('receiptNo'); }} warn={low('receiptNo')} />
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
                {t('web:claim.field.category')}
              </AppText>
              <Chips value={categoryId} onChange={setCategoryId} options={categoryChoices().map((c) => ({ value: c.id, label: nameOf(c, code) }))} />
              {errors.category ? <AppText variant="caption" tone="danger">{errors.category}</AppText> : null}
            </View>
            {!hasFile ? (
              <View style={{ gap: 6 }}>
                <AppText variant="small" weight="medium" tone="secondary">
                  {t('web:reimb.field.receipt')}
                  {receiptNeeded ? ` · ${t('web:reimb.required')}` : ''}
                </AppText>
                {receipt ? (
                  <AppText variant="small" numberOfLines={1}>
                    {receipt.fileName}
                  </AppText>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  <Button compact tone="secondary" icon={IconCamera} label={t('scan.takePhoto')} onPress={takePhoto} loading={attaching} />
                  <Button compact tone="secondary" icon={IconPhoto} label={t('scan.choosePhoto')} onPress={choosePhoto} disabled={attaching} />
                  <Button compact tone="secondary" icon={IconFileTypePdf} label={t('scan.choosePdf')} onPress={choosePdf} disabled={attaching} />
                </View>
                {cameraDenied ? <AppText variant="caption" tone="danger">{t('scan.cameraDenied')}</AppText> : null}
                {fileError ? <AppText variant="caption" tone="danger">{fileError}</AppText> : null}
              </View>
            ) : null}
            {errors.receipt ? <AppText variant="small" tone="danger">{errors.receipt}</AppText> : null}
          </Card>

          <Card style={{ gap: space.lg }}>
            <SectionHeader title={t('web:reimb.detailsTitle')} />
            <Field label={t('web:reimb.field.description')} value={description} onChangeText={setDescription} placeholder={t('web:reimb.descriptionPlaceholder')} multiline error={errors.description} />

            {options.preApprovals.length ? (
              <View style={{ gap: 6 }}>
                <AppText variant="small" weight="medium" tone="secondary">
                  {t('web:reimb.field.preApproval')}
                </AppText>
                <Chips
                  value={preApprovalId}
                  onChange={setPreApprovalId}
                  options={[{ value: '', label: t('live.claim.noPreApproval') }, ...options.preApprovals.map((p) => ({ value: p.id, label: `${p.reference} · ${amount(p.remaining, code)}` }))]}
                />
              </View>
            ) : null}
          </Card>
        </>
      )}
      {editor}
    </Page>
  );
}
