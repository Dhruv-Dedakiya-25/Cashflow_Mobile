// The demo's data while the app runs: who is signed in, and the sample requests, which the
// screens change as the API would (submit, decide, acknowledge). Lost when the app restarts.
import { useSyncExternalStore } from 'react';

import type {
  AllocationPosition, ApprovalItem, CostLevel, MyDashboard, MyRequest, ReceiptExtraction, ReimbursementView,
  RequestStatus, SettlementMethod, VatTreatment,
} from '@/api/types';

import { dateDaysAgo, omanToday } from './clock';
import {
  type Acknowledgement, type OtherRequest, computeVat, initialAcknowledgements, initialClaims, initialOtherRequests,
  initialPositions, makeClaim,
} from './data';
import { P, type Persona } from './master';

export interface MockState {
  session?: { personId: string; persona: Persona };
  claims: ReimbursementView[];
  others: OtherRequest[];
  acks: Acknowledgement[];
  positions: AllocationPosition[];
  nextClaimSeq: number;
}

let state: MockState = {
  claims: initialClaims,
  others: initialOtherRequests,
  acks: initialAcknowledgements,
  positions: initialPositions,
  nextClaimSeq: 189,
};
const listeners = new Set<() => void>();

function update(next: Partial<MockState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// ── Session ─────────────────────────────────────────────────────────────────

/** The signed-in person; screens behind sign-in can rely on it. */
export function useSession() {
  const { session } = useMockState();
  return session ?? { persona: 'employee' as Persona, personId: P.hamed };
}

export function signIn(persona: Persona, personId: string) {
  update({ session: { persona, personId } });
}

export function signOut() {
  update({ session: undefined });
}

// ── Claims ──────────────────────────────────────────────────────────────────

/** Who decides a claim, step by step, in the sample's workflow. */
function approversFor(personId: string) {
  if (personId === P.hamed) return [P.ahmed, P.fatma];
  if (personId === P.fatma) return [P.khalid];
  return [P.fatma];
}

export interface ClaimInput {
  beneficiaryId: string;
  expenseDate: string;
  categoryId: string;
  payeeName: string;
  receiptNo?: string;
  description: string;
  enteredAmount: number;
  vatTreatment: VatTreatment;
  costLevel: CostLevel;
  costId: string;
  settlement: SettlementMethod;
  receiptFile?: string;
  extraction?: ReceiptExtraction;
}

export function submitClaim(input: ClaimInput): ReimbursementView {
  const now = new Date().toISOString();
  const claim = makeClaim(state.nextClaimSeq, { ...input, createdAtUtc: now }, { approvers: approversFor(input.beneficiaryId), submitted: now });
  update({ claims: [claim, ...state.claims], nextClaimSeq: state.nextClaimSeq + 1 });
  return claim;
}

/** Sends a returned claim again with its corrections: back to the first step, one version up. */
export function resubmitClaim(id: string, input: ClaimInput) {
  const now = new Date().toISOString();
  update({
    claims: state.claims.map((c) => {
      if (c.id !== id) return c;
      const fresh = makeClaim(Number(c.id.slice(3)), { ...input, createdAtUtc: c.createdAtUtc }, { approvers: approversFor(c.beneficiaryId), submitted: now });
      return {
        ...fresh,
        version: c.version + 1,
        history: [...c.history, { id: `h-${now}`, atUtc: now, actorId: state.session?.personId ?? c.createdById, action: 'resubmitted' as const, version: c.version + 1 }],
      };
    }),
  });
}

// ── Decisions ───────────────────────────────────────────────────────────────

export type DecisionAction = 'approve' | 'return' | 'reject';

type Decidable = Pick<ReimbursementView, 'status' | 'route' | 'currentStep' | 'history' | 'version'>;

function applyDecision<T extends Decidable>(request: T, personId: string, action: DecisionAction, comment?: string): T {
  const index = request.currentStep;
  if (index === undefined || request.status !== 'inApproval') return request;
  const now = new Date().toISOString();
  const actionName = action === 'approve' ? 'approved' : action === 'return' ? 'returned' : 'rejected';
  const route = request.route.map((s, i) =>
    i === index ? { ...s, state: actionName as typeof s.state, decidedAtUtc: now, approvedByIds: action === 'approve' ? [personId] : [] } : s,
  );
  let status: RequestStatus = request.status;
  let currentStep: number | undefined;
  if (action === 'approve') {
    const next = route.findIndex((s, i) => i > index && s.state === 'waiting');
    if (next >= 0) {
      route[next] = { ...route[next], state: 'pending', startedAtUtc: now };
      currentStep = next;
    } else status = 'approved';
  } else status = actionName as RequestStatus;
  const history = [...request.history, { id: `h-${now}`, atUtc: now, actorId: personId, action: actionName as 'approved', version: request.version, stepIndex: index, comment }];
  return { ...request, route, status, currentStep, history };
}

export function decide(kind: ApprovalItem['kind'], id: string, action: DecisionAction, comment?: string) {
  const personId = state.session?.personId;
  if (!personId) return;
  if (kind === 'reimbursement') update({ claims: state.claims.map((c) => (c.id === id ? applyDecision(c, personId, action, comment) : c)) });
  else update({ others: state.others.map((o) => (o.id === id ? applyDecision(o, personId, action, comment) : o)) });
}

// ── Acknowledgements ────────────────────────────────────────────────────────

export function acknowledge(id: string) {
  const ack = state.acks.find((a) => a.id === id);
  if (!ack) return;
  update({
    acks: state.acks.filter((a) => a.id !== id),
    positions: state.positions.map((p) => {
      if (p.id !== ack.allocationId) return p;
      const available = Math.round((p.available + ack.amount) * 1000) / 1000;
      const percentLeft = Math.round((available / p.float) * 1000) / 10;
      return { ...p, available, used: Math.max(0, Math.round((p.float - available - p.reserved) * 1000) / 1000), percentLeft };
    }),
  });
}

// ── What the screens read ───────────────────────────────────────────────────

export const claimsFor = (s: MockState, personId: string) =>
  s.claims.filter((c) => c.beneficiaryId === personId || c.createdById === personId).sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

const isOverdue = (startedAtUtc?: string, slaHours = 24) => !!startedAtUtc && Date.now() - Date.parse(startedAtUtc) > slaHours * 3600_000;

export function inboxFor(s: MockState, personId: string): ApprovalItem[] {
  const waitingFor = (r: Decidable) => r.status === 'inApproval' && r.currentStep !== undefined && r.route[r.currentStep].approverIds.includes(personId);
  const claims: ApprovalItem[] = s.claims.filter(waitingFor).map((c) => ({
    kind: 'reimbursement', id: c.id, reference: c.reference, status: c.status, version: c.version, personId: c.beneficiaryId,
    createdById: c.createdById, submittedAtUtc: c.submittedAtUtc, amount: c.gross, level: c.costLevel, unitId: c.costId,
    purpose: c.description, currentStep: { index: c.currentStep!, step: c.route[c.currentStep!] }, canDecide: true,
    flags: c.createdById !== c.beneficiaryId ? ['onBehalf'] : [],
  }));
  const others: ApprovalItem[] = s.others.filter(waitingFor).map((o) => ({
    kind: o.kind, id: o.id, reference: o.reference, status: o.status, version: o.version, personId: o.personId, createdById: o.createdById,
    submittedAtUtc: o.submittedAtUtc, amount: o.amount, level: o.level, unitId: o.unitId, purpose: o.purpose,
    currentStep: { index: o.currentStep!, step: o.route[o.currentStep!] }, canDecide: true, flags: o.flags,
  }));
  return [...claims, ...others].sort((a, b) => (a.submittedAtUtc ?? '').localeCompare(b.submittedAtUtc ?? ''));
}

export const isItemOverdue = (item: ApprovalItem) => isOverdue(item.currentStep?.step.startedAtUtc, item.currentStep?.step.slaHours);

export const acksFor = (s: MockState, personId: string) => s.acks.filter((a) => a.recipientId === personId);

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const open: RequestStatus[] = ['submitted', 'inApproval'];

export function myDashboard(s: MockState, personId: string): MyDashboard {
  const mine = s.claims.filter((c) => c.beneficiaryId === personId);
  const month = omanToday().slice(0, 7);
  const paidThisMonth = mine.filter((c) => c.status === 'paid' && c.payment?.paidOn.startsWith(month));
  const awaiting = mine.filter((c) => open.includes(c.status));
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    const inMonth = mine.filter((c) => c.expenseDate.startsWith(key) && !['draft', 'returned', 'rejected', 'cancelled'].includes(c.status));
    const sum = (pred: (c: ReimbursementView) => boolean) => round3(inMonth.filter(pred).reduce((t, c) => t + c.gross, 0));
    return {
      month: `${key}-01`,
      pettyCash: sum((c) => c.status === 'paid' && c.settlement === 'pettyCash'),
      salary: sum((c) => c.status === 'paid' && c.settlement === 'salary'),
      pending: sum((c) => c.status !== 'paid'),
    };
  });
  const year = month.slice(0, 4);
  const byCategory = new Map<string, { amount: number; count: number }>();
  mine.filter((c) => c.expenseDate.startsWith(year) && c.status !== 'draft').forEach((c) => {
    const e = byCategory.get(c.categoryId) ?? { amount: 0, count: 0 };
    byCategory.set(c.categoryId, { amount: round3(e.amount + c.gross), count: e.count + 1 });
  });
  const recent: MyRequest[] = claimsFor(s, personId).slice(0, 4).map((c) => ({
    kind: 'reimbursement', id: c.id, reference: c.reference, date: c.expenseDate, purpose: c.description, amount: c.gross,
    status: c.status, beneficiaryId: c.beneficiaryId, createdById: c.createdById, hasReceipt: !!c.receipt,
    waitingForIds: c.currentStep !== undefined ? c.route[c.currentStep].approverIds : undefined,
  }));
  const inbox = inboxFor(s, personId);
  return {
    approvedAvailable: personId === P.ahmed ? 71.25 : 0,
    approvedCount: personId === P.ahmed ? 1 : 0,
    awaitingCount: awaiting.length,
    awaitingAmount: round3(awaiting.reduce((t, c) => t + c.gross, 0)),
    returnedCount: mine.filter((c) => c.status === 'returned').length,
    paidThisMonth: round3(paidThisMonth.reduce((t, c) => t + c.gross, 0)),
    paidThisMonthCount: paidThisMonth.length,
    recent,
    approvals: inbox.length || personId !== P.hamed ? { items: inbox, total: inbox.length, overdue: inbox.filter(isItemOverdue).length } : undefined,
    custodian: s.positions.filter((p) => p.custodianId === personId).map((position) => ({ position })),
    toAcknowledge: acksFor(s, personId),
    months,
    categories: [...byCategory.entries()].map(([categoryId, e]) => ({ categoryId, ...e })).sort((a, b) => b.amount - a.amount),
  };
}

/** Petty cash across the company, from its allocations: Home's company card and the allocation list. */
export function companySummary(positions: AllocationPosition[], toPayCount: number, toPayAmount: number) {
  const floats = round3(positions.reduce((t, p) => t + p.float, 0));
  const available = round3(positions.reduce((t, p) => t + p.available, 0));
  return {
    positions,
    floats,
    available,
    availablePercent: floats ? Math.round((available / floats) * 1000) / 10 : null,
    toPayCount,
    toPayAmount,
    attention: positions.filter((p) => p.band === 'near' || p.band === 'watch' || p.band === 'exceeded'),
    /** The allocations' totals by what they are held for: business units, departments, projects, custodians. */
    groups: (['businessUnit', 'department', 'project', 'custodian'] as const)
      .map((level) => {
        const held = positions.filter((p) => p.level === level);
        return {
          level,
          count: held.length,
          float: round3(held.reduce((t, p) => t + p.float, 0)),
          available: round3(held.reduce((t, p) => t + p.available, 0)),
        };
      })
      .filter((g) => g.count > 0),
  };
}

/** Finance's view of the sample: its allocations and the approved claims waiting to be paid. */
export function financeSummary(s: MockState) {
  const toPay = s.claims.filter((c) => c.status === 'approved');
  return companySummary(s.positions, toPay.length, round3(toPay.reduce((t, c) => t + c.gross, 0)));
}

/** The sample's answer for any receipt: the web demo reads every receipt as this one. */
export function sampleReading(): { extraction: ReceiptExtraction; input: Omit<ClaimInput, 'beneficiaryId' | 'description' | 'costLevel' | 'costId' | 'settlement'> } {
  const date = dateDaysAgo(1);
  const { vat } = computeVat(19.87, 'inclusive');
  return {
    extraction: {
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      extractedAtUtc: new Date().toISOString(),
      confidence: 93,
      fields: {
        merchant: { value: 'Al Maha Petroleum', confidence: 98 },
        receiptNo: { value: '846517', confidence: 95 },
        expenseDate: { value: date, confidence: 96 },
        grossAmount: { value: '19.870', confidence: 97 },
        vatAmount: { value: vat.toFixed(3), confidence: 74 },
        category: { value: 'Fuel', confidence: 92 },
      },
      categoryId: 'cat-002',
    },
    input: { expenseDate: date, categoryId: 'cat-002', payeeName: 'Al Maha Petroleum', receiptNo: '846517', enteredAmount: 19.87, vatTreatment: 'inclusive' },
  };
}
