import { IconArrowBackUp, IconCheck, IconCircleCheck, IconCircleX, IconInfoCircle, IconSparkles, IconUserShare, IconX } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { RequestKind, RouteStep } from '@/api/types';
import { AppText } from '@/components/app-text';
import { ApprovalPath } from '@/components/approval-path';
import { Page } from '@/components/page';
import { ReceiptPaper } from '@/components/receipt-paper';
import { Avatar, Button, Card, DetailRow, Field, Pill, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { category, longDate, nameOf, omr, person, unit, vendor } from '@/lib/format';
import { decide, useMockState, useSession, type DecisionAction } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

export default function ReviewScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: RequestKind; id: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { personId } = useSession();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  // What happened, worked out when deciding: afterwards the request has already moved on.
  const [done, setDone] = useState<{ action: DecisionAction; text: string } | null>(null);

  const claim = kind === 'reimbursement' ? state.claims.find((c) => c.id === id) : undefined;
  const other = kind !== 'reimbursement' ? state.others.find((o) => o.id === id) : undefined;
  const request = claim ?? other;
  if (!request) {
    return (
      <Page title={t('tabs.inbox')}>
        <AppText tone="muted">{t('web:txn.notFound')}</AppText>
      </Page>
    );
  }

  const personIdOf = claim ? claim.beneficiaryId : other!.personId;
  const who = person(personIdOf)!;
  const amountValue = claim ? claim.gross : other!.amount;
  const purpose = claim ? claim.description : other!.purpose;
  const unitId = claim ? claim.costId : other!.unitId;
  const step: RouteStep | undefined = request.currentStep !== undefined ? request.route[request.currentStep] : undefined;
  const canDecide = request.status === 'inApproval' && !!step?.approverIds.includes(personId);
  const nextStep = request.currentStep !== undefined ? request.route.slice(request.currentStep + 1).find((s) => s.state === 'waiting') : undefined;
  const nextNames = nextStep?.approverIds.map((p) => nameOf(person(p), code)).join(', ');
  const position = claim?.settlement === 'pettyCash' ? state.positions.find((p) => p.scopeId === claim.costId) : undefined;
  const merchant = claim ? (claim.vendorId ? nameOf(vendor(claim.vendorId), code) : claim.payeeName ?? '') : '';

  const outcome = nextStep
    ? t('web:approval.outcome.next', { step: request.currentStep! + 2, names: nextNames })
    : t(kind === 'reimbursement' ? (claim?.settlement === 'salary' ? 'web:approval.outcome.salary' : 'web:approval.outcome.claim') : kind === 'preExpense' ? 'web:approval.outcome.preExpense' : 'web:approval.outcome.cash');

  const submit = (action: DecisionAction) => {
    if (action !== 'approve' && !comment.trim()) return setError(t('web:approval.decision.reasonNeeded'));
    const text =
      action === 'approve'
        ? nextStep
          ? t('review.sentOn', { reference: request.reference, names: nextNames })
          : t('review.final', { reference: request.reference })
        : action === 'return'
          ? t('review.returnedTo', { name: nameOf(who, code), reference: request.reference })
          : t('review.rejectedFor', { name: nameOf(who, code) });
    decide(kind, id, action, comment.trim() || undefined);
    setDone({ action, text });
  };

  if (done) {
    const doneLook = {
      approve: { icon: IconCircleCheck, color: palette.success, bg: palette.successSoft },
      return: { icon: IconArrowBackUp, color: palette.warning, bg: palette.warningSoft },
      reject: { icon: IconCircleX, color: palette.danger, bg: palette.dangerSoft },
    }[done.action];
    const DoneIcon = doneLook.icon;
    return (
      <Page title={request.reference} footer={<Button label={t('review.backToInbox')} onPress={() => router.back()} />}>
        <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxxl }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: doneLook.bg, alignItems: 'center', justifyContent: 'center' }}>
            <DoneIcon size={52} color={doneLook.color} strokeWidth={1.6} />
          </View>
          <AppText variant="heading" weight="bold" align="center">
            {t(`review.done.${done.action === 'approve' ? 'approved' : done.action === 'return' ? 'returned' : 'rejected'}`)}
          </AppText>
          <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
            {done.text}
          </AppText>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={t(`web:approval.detailsTitle.${kind}`)}
      right={<Pill label={request.reference} bg={palette.surfaceStrong} fg={palette.textSecondary} />}
      footer={
        canDecide ? (
          <View style={{ gap: space.sm }}>
            <Button label={t('web:approval.decision.approve')} tone="success" icon={IconCheck} onPress={() => submit('approve')} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button label={t('web:approval.decision.return')} tone="secondary" icon={IconArrowBackUp} onPress={() => submit('return')} compact />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={t('web:approval.decision.reject')} tone="danger" icon={IconX} onPress={() => submit('reject')} compact />
              </View>
            </View>
          </View>
        ) : undefined
      }>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={who.nameEn} id={who.id} size={48} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{nameOf(who, code)}</AppText>
            <AppText variant="small" tone="secondary">
              {who.designation} · {nameOf(unit(who.departmentId), code)}
            </AppText>
          </View>
        </View>
        <AppText variant="display" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
          {omr(amountValue, code)}
        </AppText>
        <AppText>{purpose}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Pill label={t(`web:approval.kind.${kind}`)} bg={palette.primarySoft} fg={palette.primary} />
          <Pill label={nameOf(unit(unitId), code)} bg={palette.surfaceStrong} fg={palette.textSecondary} />
        </View>
      </Card>

      {claim && claim.createdById !== claim.beneficiaryId ? (
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: palette.warningSoft, borderRadius: radius.lg, padding: space.md }}>
          <IconUserShare size={20} color={palette.warning} />
          <AppText variant="small" style={{ flex: 1 }}>
            {t('web:approval.flag.onBehalf')} · {t('web:claim.enteredBy', { name: nameOf(person(claim.createdById), code) })}
          </AppText>
        </View>
      ) : null}

      {position ? (
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: palette.tealSoft, borderRadius: radius.lg, padding: space.md }}>
          <IconInfoCircle size={20} color={palette.teal} />
          <AppText variant="small" style={{ flex: 1 }}>
            {t('review.available', { reference: position.reference, amount: omr(position.available, code) })}
          </AppText>
        </View>
      ) : null}

      {claim ? (
        <Card style={{ gap: 0 }}>
          <SectionHeader title={t('web:approval.attachmentTitle')} />
          <View style={{ paddingVertical: space.lg }}>
            <ReceiptPaper merchant={merchant} receiptNo={claim.receiptNo} date={claim.expenseDate} item={claim.description.length > 22 ? `${claim.description.slice(0, 21)}…` : claim.description} net={claim.net} vat={claim.vat} gross={claim.gross} compact />
          </View>
          {claim.extraction ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.sm }}>
              <IconSparkles size={18} color={palette.primary} />
              <AppText variant="small" tone="primary">
                {t('web:scan.readBy', { provider: claim.extraction.provider })} · {t('web:scan.aiConfidence', { confidence: claim.extraction.confidence })}
              </AppText>
            </View>
          ) : null}
          <DetailRow first label={t('web:claim.field.merchant')} value={merchant || '—'} />
          <DetailRow label={t('web:claim.field.category')} value={nameOf(category(claim.categoryId), code)} />
          <DetailRow label={t('web:reimb.field.expenseDate')} value={longDate(claim.expenseDate, code)} />
          <DetailRow label={t('web:reimb.field.receiptNo')} value={claim.receiptNo ?? '—'} />
          <DetailRow label={t('web:reimb.field.settlement')} value={t(`web:reimb.settlement.${claim.settlement}`)} />
          {claim.preExpenseReference ? <DetailRow label={t('web:reimb.field.preApproval')} value={claim.preExpenseReference} /> : null}
          <DetailRow label={claim.vat ? `VAT ${claim.vatRate}%` : t('web:reimb.amount.noVat')} value={omr(claim.vat, code)} />
        </Card>
      ) : other ? (
        <Card style={{ gap: 0 }}>
          {other.categoryId ? <DetailRow first label={t('web:claim.field.category')} value={nameOf(category(other.categoryId), code)} /> : null}
          <DetailRow first={!other.categoryId} label={t('web:reimb.field.expenseDate')} value={longDate(other.date, code)} />
          <DetailRow label={t('web:claim.field.chargedTo')} value={nameOf(unit(other.unitId), code)} />
        </Card>
      ) : null}

      <Card>
        <SectionHeader title={t('web:txn.path.title')} />
        <ApprovalPath route={request.route} />
      </Card>

      {canDecide ? (
        <Card style={{ gap: space.md }}>
          <SectionHeader title={t('web:approval.decision.title')} />
          <AppText variant="small" tone="secondary">
            {outcome}
          </AppText>
          <Field
            label={t('web:approval.decision.comment')}
            placeholder={t('web:approval.decision.placeholder')}
            value={comment}
            onChangeText={(v) => { setComment(v); setError(null); }}
            multiline
            error={error ?? undefined}
          />
          <AppText variant="caption" tone="muted">
            {t('web:approval.decision.noMoney')}
          </AppText>
        </Card>
      ) : step ? (
        <AppText variant="small" tone="muted">
          {t('web:approval.othersTurn', { names: step.approverIds.map((p) => nameOf(person(p), code)).join(', '), n: request.currentStep! + 1 })}
        </AppText>
      ) : null}
    </Page>
  );
}
