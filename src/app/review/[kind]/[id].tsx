import { IconArrowBackUp, IconCheck, IconCircleCheck, IconCircleX, IconFileText, IconInfoCircle, IconPencil, IconSparkles, IconUserShare, IconX } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { decide as decideLive, holds, useOutcomeRead, useReview } from '@/api/live';
import type { RequestKind, RouteStep } from '@/api/types';
import { useAppSession, useApproves } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { ApprovalPath, shownStepNo } from '@/components/approval-path';
import { FinancePanel, financeDraftOf, financeInputOf, type FinanceDraft } from '@/components/finance-panel';
import { Page } from '@/components/page';
import { ReceiptPaper } from '@/components/receipt-paper';
import { ReceiptPhoto } from '@/components/receipt-photo';
import { Avatar, Button, Card, DetailRow, Field, Pill, SectionHeader } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { category, dateTime, longDate, nameOf, omr, person, unit, vendor } from '@/lib/format';
import { decide, useMockState, useSession, type DecisionAction } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

export default function ReviewScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: RequestKind; id: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const code = language.code;
  const state = useMockState();
  const { personId, persona } = useSession();
  const approves = useApproves();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  // What happened, worked out when deciding: afterwards the request has already moved on.
  const [done, setDone] = useState<{ action: DecisionAction; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  // Finance's choices once it changes one; until then the claim's own values.
  const [finance, setFinance] = useState<FinanceDraft | null>(null);
  const [financeError, setFinanceError] = useState<string>();
  const { user } = useAppSession();
  // Live: the review the API gives the approver; demo: the request in the sample store.
  const reviewQuery = useReview(kind, user ? id : '');
  const review = user ? reviewQuery.data : undefined;
  useOutcomeRead(kind, review?.item.id, review?.item.status);

  const claim = user ? (review?.request.kind === 'reimbursement' ? review.request.record : undefined) : kind === 'reimbursement' ? state.claims.find((c) => c.id === id) : undefined;
  const other = user ? undefined : kind !== 'reimbursement' ? state.others.find((o) => o.id === id) : undefined;
  const request = user ? review?.request.record : (claim ?? other);
  if (!request) {
    return (
      <Page title={t('tabs.inbox')}>
        {user && reviewQuery.isLoading ? <ActivityIndicator color={palette.primary} /> : <AppText tone="muted">{reviewQuery.error?.message ?? t('web:txn.notFound')}</AppText>}
      </Page>
    );
  }

  const item = review?.item;
  const personIdOf = item ? item.personId : claim ? claim.beneficiaryId : other!.personId;
  const who = person(personIdOf);
  const amountValue = item ? item.amount : claim ? claim.gross : other!.amount;
  const purpose = item ? item.purpose : claim ? claim.description : other!.purpose;
  const unitId = item ? item.unitId : claim ? claim.costId : other!.unitId;
  const step: RouteStep | undefined = request.currentStep !== undefined ? request.route[request.currentStep] : undefined;
  const canDecide = item ? item.canDecide : (claim ?? other)!.status === 'inApproval' && !!step?.approverIds.includes(personId);
  const nextStep = request.currentStep !== undefined ? request.route.slice(request.currentStep + 1).find((s) => s.state === 'waiting') : undefined;
  const nextNames = nextStep?.approverIds.map((p) => nameOf(person(p), code)).join(', ');
  // Once decided, who decided and why, as the web's review page shows it: the requester reads it here.
  const status = item ? item.status : (claim ?? other)!.status;
  const ended = status === 'submitted' || status === 'inApproval' ? undefined
    : [...request.history].reverse().find((h) => ['approved', 'returned', 'rejected', 'cancelled'].includes(h.action));
  const position = review ? review.allocation : claim?.settlement === 'pettyCash' ? state.positions.find((p) => p.scopeId === claim.costId) : undefined;
  const merchant = claim ? (claim.vendorId ? nameOf(vendor(claim.vendorId), code) : claim.payeeName ?? '') : '';
  // Finance's step: a role step whose role pays claims, as the server decides; in the demo, the Finance persona's.
  const financeStep = canDecide && !!claim && (item ? item.currentStep?.step.approverSource === 'role' && !!user && holds(user, 'FinanceSettlement', 'pay') : persona === 'finance');
  const draft = financeStep ? (finance ?? financeDraftOf(claim!)) : undefined;
  const settlement = draft?.settlement ?? claim?.settlement;

  const outcome = nextStep
    ? t('web:approval.outcome.next', { step: shownStepNo(request.route, request.route.indexOf(nextStep)), names: nextNames })
    : t(kind === 'reimbursement' ? (settlement === 'salary' ? 'web:approval.outcome.salary' : 'web:approval.outcome.claim') : kind === 'preExpense' ? 'web:approval.outcome.preExpense' : 'web:approval.outcome.cash');

  const submit = async (action: DecisionAction) => {
    if (action !== 'approve' && !comment.trim()) return setError(t('web:approval.decision.reasonNeeded'));
    const settled = action === 'approve' && draft ? financeInputOf(draft) : undefined;
    if (action === 'approve' && draft && !settled) return setFinanceError(t('web:txn.refusal.amount'));
    const text =
      action === 'approve'
        ? nextStep
          ? t('review.sentOn', { reference: request.reference, names: nextNames })
          : t('review.final', { reference: request.reference })
        : action === 'return'
          ? t('review.returnedTo', { name: nameOf(who, code), reference: request.reference })
          : t('review.rejectedFor', { name: nameOf(who, code) });
    if (item) {
      setSending(true);
      setError(null);
      try {
        await decideLive(item, action, comment.trim() || undefined, settled);
        setDone({ action, text });
      } catch (e) {
        // Decided by someone else first, or changed since it was opened: the server says which.
        setError((e as Error).message);
      } finally {
        setSending(false);
      }
      return;
    }
    decide(kind, id, action, comment.trim() || undefined, settled);
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
            {/* Here, beside the buttons, and not under the reason box, which is often scrolled out of sight. */}
            {error ? (
              <AppText variant="small" tone="danger" accessibilityRole="alert">
                {error}
              </AppText>
            ) : null}
            <Button label={t('web:approval.decision.approve')} tone="success" icon={IconCheck} loading={sending} onPress={() => submit('approve')} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button label={t('web:approval.decision.return')} tone="secondary" icon={IconArrowBackUp} disabled={sending} onPress={() => submit('return')} compact />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={t('web:approval.decision.reject')} tone="danger" icon={IconX} disabled={sending} onPress={() => submit('reject')} compact />
              </View>
            </View>
          </View>
        ) : undefined
      }>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={who?.nameEn ?? '?'} id={personIdOf} size={48} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{nameOf(who, code)}</AppText>
            <AppText variant="small" tone="secondary">
              {[who?.designation, nameOf(unit(who?.departmentId ?? ''), code)].filter(Boolean).join(' · ')}
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

      {ended ? (
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: ended.action === 'approved' ? palette.successSoft : ended.action === 'returned' ? palette.warningSoft : palette.dangerSoft, borderRadius: radius.lg, padding: space.md }}>
          <IconInfoCircle size={20} color={ended.action === 'approved' ? palette.success : ended.action === 'returned' ? palette.warning : palette.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="small" weight="semibold">
              {t(`web:approval.ended.${ended.action}`, { name: nameOf(person(ended.actorId), code), time: dateTime(ended.atUtc, code) })}
            </AppText>
            {ended.comment ? <AppText variant="small">{ended.comment}</AppText> : null}
          </View>
        </View>
      ) : null}

      {claim && claim.createdById !== claim.beneficiaryId ? (
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: palette.warningSoft, borderRadius: radius.lg, padding: space.md }}>
          <IconUserShare size={20} color={palette.warning} />
          <AppText variant="small" style={{ flex: 1 }}>
            {t('web:approval.flag.onBehalf')} · {t('web:claim.enteredBy', { name: nameOf(person(claim.createdById), code) })}
          </AppText>
        </View>
      ) : null}

      {review?.changes.length ? (
        <Card style={{ gap: space.sm, borderColor: palette.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconPencil size={18} color={palette.warning} />
            <AppText weight="semibold" style={{ flex: 1 }}>
              {t('web:approval.changes.title')}
            </AppText>
          </View>
          {review.lastReturn ? (
            <AppText variant="small" tone="secondary">
              {t('web:approval.changes.after', { name: nameOf(person(review.lastReturn.actorId), code), time: dateTime(review.lastReturn.atUtc, code) })}
            </AppText>
          ) : null}
          {review.changes.map((c) => (
            <View key={c.field} style={{ gap: 2, paddingTop: space.xs }}>
              <AppText variant="caption" weight="semibold" tone="muted">
                {t(`web:${c.field.replace(/^[a-z]+:/, '')}`)}
              </AppText>
              {c.from !== undefined ? (
                <AppText variant="small" tone="muted" style={{ textDecorationLine: 'line-through' }}>
                  {c.codes ? t(`web:${c.codes.replace(/^[a-z]+:/, '')}${c.from}`) : c.from || '—'}
                </AppText>
              ) : null}
              <AppText variant="small" weight="medium">
                {c.codes ? t(`web:${c.codes.replace(/^[a-z]+:/, '')}${c.to}`) : c.to || '—'}
              </AppText>
            </View>
          ))}
        </Card>
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
          <View style={{ paddingVertical: space.lg, gap: space.sm }}>
            {user ? (
              claim.receipt ? (
                <>
                  <ReceiptPhoto receipt={claim.receipt} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <IconFileText size={18} color={palette.textMuted} />
                    <AppText variant="small" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                      {claim.receipt.fileName}
                    </AppText>
                  </View>
                </>
              ) : (
                <AppText variant="small" tone="muted">
                  {t('live.review.noReceipt')}
                </AppText>
              )
            ) : (
              <ReceiptPaper merchant={merchant} receiptNo={claim.receiptNo} date={claim.expenseDate} item={claim.description.length > 22 ? `${claim.description.slice(0, 21)}…` : claim.description} net={claim.net} vat={claim.vat} gross={claim.gross} compact />
            )}
          </View>
          {claim.extraction ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.sm }}>
              <IconSparkles size={18} color={palette.primary} />
              <AppText variant="small" tone="primary">
                {t('web:scan.aiConfidence', { confidence: Math.round(claim.extraction.confidence) })}
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
      ) : item ? (
        <Card style={{ gap: 0 }}>
          <DetailRow first label={t('web:claim.field.chargedTo')} value={nameOf(unit(item.unitId), code)} />
          {item.submittedAtUtc ? <DetailRow label={t('live.review.sent')} value={dateTime(item.submittedAtUtc, code)} /> : null}
        </Card>
      ) : other ? (
        <Card style={{ gap: 0 }}>
          {other.categoryId ? <DetailRow first label={t('web:claim.field.category')} value={nameOf(category(other.categoryId), code)} /> : null}
          <DetailRow first={!other.categoryId} label={t('web:reimb.field.expenseDate')} value={longDate(other.date, code)} />
          <DetailRow label={t('web:claim.field.chargedTo')} value={nameOf(unit(other.unitId), code)} />
        </Card>
      ) : null}

      {approves ? (
        <Card>
          <SectionHeader title={t('web:txn.path.title')} />
          <ApprovalPath route={request.route} />
        </Card>
      ) : null}

      {draft ? (
        <FinancePanel
          claim={claim!}
          value={draft}
          onChange={(v) => { setFinance(v); setFinanceError(undefined); }}
          error={financeError}
        />
      ) : null}

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
          />
          <AppText variant="caption" tone="muted">
            {t('web:approval.decision.noMoney')}
          </AppText>
        </Card>
      ) : step ? (
        <AppText variant="small" tone="muted">
          {t('web:approval.othersTurn', { names: step.approverIds.map((p) => nameOf(person(p), code)).join(', '), n: shownStepNo(request.route, request.currentStep!) })}
        </AppText>
      ) : null}
    </Page>
  );
}
