// Sample requests for the demo, built around three people: Hamed (claims), Ahmed (approves IT's
// claims and holds the IT float) and Fatma (Finance's step). References and amounts follow the
// web app's demo where it has them.
import type {
  AllocationLevel, AllocationPosition, ApprovalFlag, AwaitingAcknowledgement, CostLevel, HistoryEntry,
  PaymentMethod, ReceiptExtraction, ReimbursementView, RequestKind, RequestStatus, RouteStep, SettlementMethod,
  SkipReason, VatTreatment,
} from '@/api/types';

import { dateDaysAgo, daysAgo, hoursAgo } from './clock';
import { P } from './master';

export const VAT_RATE = 5;
const YEAR = new Date().getFullYear();
export const ref = (prefix: string, seq: number) => `${prefix}-${YEAR}-${String(seq).padStart(4, '0')}`;

/** Net and VAT from the amount entered, worked in whole baisa. */
export function computeVat(entered: number, treatment: VatTreatment) {
  const baisa = Math.round(entered * 1000);
  if (treatment === 'none') return { net: entered, vat: 0, gross: entered };
  if (treatment === 'exclusive') {
    const vat = Math.round((baisa * VAT_RATE) / 100);
    return { net: entered, vat: vat / 1000, gross: (baisa + vat) / 1000 };
  }
  const net = Math.round((baisa * 100) / (100 + VAT_RATE));
  return { net: net / 1000, vat: (baisa - net) / 1000, gross: entered };
}

type Approver = string | { id: string; skip: SkipReason };
type Decision = { by: string; days: number; time: string; action: 'approve' | 'return' | 'reject'; comment?: string };
export type Flow = { approvers: Approver[]; submitted?: string; decisions?: Decision[]; paid?: { days: number; method: PaymentMethod; voucher: string; reference?: string } };

/** A route and history played from a list of decisions, as the API would hold them. */
export function playFlow(flow: Flow, createdById: string, createdAtUtc: string) {
  const history: HistoryEntry[] = [{ id: `h-${createdAtUtc}`, atUtc: createdAtUtc, actorId: createdById, action: 'created', version: 1 }];
  if (!flow.submitted) return { status: 'draft' as RequestStatus, route: [] as RouteStep[], history, currentStep: undefined };
  history.push({ id: `h-${flow.submitted}`, atUtc: flow.submitted, actorId: createdById, action: 'submitted', version: 1 });

  let status: RequestStatus = 'inApproval';
  let started = flow.submitted;
  // Pending is the step waiting for a decision now; waiting is a step not reached yet, as in the API.
  let waiting = false;
  const decisions = [...(flow.decisions ?? [])];
  const route: RouteStep[] = flow.approvers.map((a, i) => {
    const id = typeof a === 'string' ? a : a.id;
    const base = { stepId: `step-${i + 1}`, approvalMode: 'any' as const, slaHours: 24, approverIds: [id], approvedByIds: [] as string[] };
    if (typeof a !== 'string') return { ...base, approverIds: [], state: 'skipped' as const, skipReason: a.skip };
    if (status !== 'inApproval' || waiting) return { ...base, state: 'waiting' as const };
    const d = decisions[0]?.by === id ? decisions.shift() : undefined;
    if (!d) {
      waiting = true;
      return { ...base, state: 'pending' as const, startedAtUtc: started };
    }
    const at = daysAgo(d.days, d.time);
    const action = d.action === 'approve' ? 'approved' : d.action === 'return' ? 'returned' : 'rejected';
    history.push({ id: `h-${at}`, atUtc: at, actorId: d.by, action, version: 1, stepIndex: i, comment: d.comment });
    started = at;
    if (d.action !== 'approve') status = action as RequestStatus;
    return { ...base, state: action as RouteStep['state'], approvedByIds: d.action === 'approve' ? [d.by] : [], startedAtUtc: started, decidedAtUtc: at };
  });
  const waitingAt = route.findIndex((s) => s.state === 'pending');
  if (status === 'inApproval' && waitingAt < 0) status = 'approved';
  if (flow.paid && status === 'approved') {
    const at = daysAgo(flow.paid.days, '13:15');
    history.push({ id: `h-${at}`, atUtc: at, actorId: P.fatma, action: 'paid', version: 1 });
    status = 'paid';
  }
  return { status, route, history, currentStep: waitingAt >= 0 ? waitingAt : undefined };
}

type ClaimFields = {
  beneficiaryId: string;
  createdById?: string;
  expenseDate: string;
  categoryId: string;
  vendorId?: string;
  payeeName?: string;
  receiptNo?: string;
  description: string;
  enteredAmount: number;
  vatTreatment: VatTreatment;
  costLevel: CostLevel;
  costId: string;
  settlement?: SettlementMethod;
  preExpenseReference?: string;
  createdAtUtc: string;
  receiptFile?: string;
  extraction?: ReceiptExtraction;
};

export function makeClaim(seq: number, f: ClaimFields, flow: Flow): ReimbursementView {
  const createdById = f.createdById ?? f.beneficiaryId;
  const { status, route, history, currentStep } = playFlow(flow, createdById, f.createdAtUtc);
  const amounts = computeVat(f.enteredAmount, f.vatTreatment);
  return {
    id: `er-${seq}`,
    reference: ref('ER', seq),
    status,
    version: 1,
    createdById,
    createdAtUtc: f.createdAtUtc,
    submittedAtUtc: flow.submitted,
    route,
    currentStep,
    history,
    beneficiaryId: f.beneficiaryId,
    basis: f.preExpenseReference ? 'preApproved' : 'direct',
    preExpenseReference: f.preExpenseReference,
    expenseDate: f.expenseDate,
    categoryId: f.categoryId,
    vendorId: f.vendorId,
    payeeName: f.payeeName,
    receiptNo: f.receiptNo,
    description: f.description,
    enteredAmount: f.enteredAmount,
    vatTreatment: f.vatTreatment,
    vatRate: VAT_RATE,
    ...amounts,
    costLevel: f.costLevel,
    costId: f.costId,
    settlement: f.settlement ?? 'pettyCash',
    receipt: f.receiptFile
      ? { fileName: f.receiptFile, contentType: f.receiptFile.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', sizeBytes: 412_000, uploadedAtUtc: f.createdAtUtc, uploadedById: createdById }
      : undefined,
    extraction: f.extraction,
    allocationReference: f.settlement === 'salary' ? undefined : f.costId === 'dep-it' ? ref('ALC', 31) : f.costId === 'prj-002' ? ref('ALC', 32) : f.costId === 'prj-003' ? ref('ALC', 33) : undefined,
    payment: flow.paid && status === 'paid'
      ? { voucherNo: ref('PV', Number(flow.paid.voucher)), method: flow.paid.method, reference: flow.paid.reference, paidOn: dateDaysAgo(flow.paid.days), amount: amounts.gross, paidById: P.fatma, recordedAtUtc: daysAgo(flow.paid.days, '13:15') }
      : undefined,
  };
}

const itRoute: Approver[] = [P.ahmed, P.fatma];
const sampleReading = (days: number, confidence: number, values: Record<string, [string, number]>, categoryId: string): ReceiptExtraction => ({
  provider: 'Google Gemini',
  model: 'gemini-3.8-flash',
  extractedAtUtc: daysAgo(days, '09:00'),
  confidence,
  fields: Object.fromEntries(Object.entries(values).map(([k, [value, c]]) => [k, { value, confidence: c }])),
  categoryId,
});

export const initialClaims: ReimbursementView[] = [
  // Hamed's
  makeClaim(186, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(2), categoryId: 'cat-005', vendorId: 'srv-006', receiptNo: 'SCO-40388',
    description: 'Courier of signed contracts to the Sohar branch.', enteredAmount: 12.6, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(1, '08:42'), receiptFile: 'swift-courier-40388.pdf',
  }, { approvers: itRoute, submitted: daysAgo(1, '08:45') }),
  makeClaim(187, {
    beneficiaryId: P.hamed, createdById: P.ahmed, expenseDate: dateDaysAgo(2), categoryId: 'cat-006', payeeName: 'Muscat Airport Parking',
    description: 'Airport parking while collecting the visiting vendor engineer.', enteredAmount: 6, vatTreatment: 'none',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(1, '12:32'), receiptFile: 'airport-parking.jpg',
  }, { approvers: [{ id: P.ahmed, skip: 'selfApproval' }, P.fatma], submitted: daysAgo(1, '12:35') }),
  makeClaim(179, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(5), categoryId: 'cat-001', vendorId: 'ven-003',
    description: 'Taxi to the data centre for the storage upgrade.', enteredAmount: 8.4, vatTreatment: 'none',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(5, '17:05'), receiptFile: 'oman-taxi.jpg',
  }, { approvers: itRoute, submitted: daysAgo(5, '17:06'), decisions: [{ by: P.ahmed, days: 3, time: '10:20', action: 'return', comment: 'The receipt number is missing. Please add it from the bill.' }] }),
  makeClaim(174, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(21), categoryId: 'cat-004', vendorId: 'sup-002', receiptNo: 'INV-45612-0918',
    description: 'Network patch cables, connectors and labels for the second floor.', enteredAmount: 412.65, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(20, '09:10'), receiptFile: 'muscat-office-45612.jpg',
  }, { approvers: itRoute, submitted: daysAgo(20, '09:12'), decisions: [{ by: P.ahmed, days: 19, time: '11:05', action: 'approve' }, { by: P.fatma, days: 18, time: '15:40', action: 'approve' }], paid: { days: 16, method: 'bankTransfer', voucher: '139', reference: 'FT2610021340' } }),
  makeClaim(131, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(48), categoryId: 'cat-002', vendorId: 'ven-001', receiptNo: '829114',
    description: 'Fuel for the trip to install the Barka branch switch.', enteredAmount: 19.4, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(47, '10:00'), receiptFile: 'al-maha-829114.jpg',
  }, { approvers: itRoute, submitted: daysAgo(47, '10:02'), decisions: [{ by: P.ahmed, days: 46, time: '09:30', action: 'approve' }, { by: P.fatma, days: 45, time: '12:10', action: 'approve' }], paid: { days: 44, method: 'cash', voucher: '097' } }),
  makeClaim(104, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(76), categoryId: 'cat-004', vendorId: 'sup-002', receiptNo: 'INV-44107-0711',
    description: 'Keyboards and mice for the help desk spares.', enteredAmount: 46.2, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(75, '14:20'), receiptFile: 'muscat-office-44107.jpg',
  }, { approvers: itRoute, submitted: daysAgo(75, '14:22'), decisions: [{ by: P.ahmed, days: 74, time: '10:15', action: 'approve' }, { by: P.fatma, days: 73, time: '13:00', action: 'approve' }], paid: { days: 72, method: 'cash', voucher: '071' } }),
  makeClaim(88, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(104), categoryId: 'cat-005', vendorId: 'srv-006', receiptNo: 'SCO-38820',
    description: 'Courier of a faulty laptop to the repair centre.', enteredAmount: 12.05, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(103, '11:40'), receiptFile: 'swift-courier-38820.pdf',
  }, { approvers: itRoute, submitted: daysAgo(103, '11:41'), decisions: [{ by: P.ahmed, days: 102, time: '09:05', action: 'approve' }, { by: P.fatma, days: 101, time: '16:20', action: 'approve' }], paid: { days: 100, method: 'cash', voucher: '052' } }),
  makeClaim(62, {
    beneficiaryId: P.hamed, expenseDate: dateDaysAgo(131), categoryId: 'cat-011', payeeName: 'Omantel',
    description: 'Business calls while supporting the Salalah office.', enteredAmount: 14.7, vatTreatment: 'inclusive', settlement: 'salary',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(130, '18:10'), receiptFile: 'omantel-bill.pdf',
  }, { approvers: itRoute, submitted: daysAgo(130, '18:12'), decisions: [{ by: P.ahmed, days: 129, time: '08:50', action: 'approve' }, { by: P.fatma, days: 128, time: '11:30', action: 'approve' }], paid: { days: 120, method: 'salary', voucher: '031', reference: 'PAYROLL' } }),

  // Ahmed's
  makeClaim(184, {
    beneficiaryId: P.ahmed, expenseDate: dateDaysAgo(4), categoryId: 'cat-002', vendorId: 'ven-001', receiptNo: '846292',
    description: 'Fuel for the customer visit to Sohar.', enteredAmount: 18.75, vatTreatment: 'inclusive', preExpenseReference: ref('PEA', 38),
    costLevel: 'project', costId: 'prj-001', createdAtUtc: daysAgo(3, '09:02'), receiptFile: 'al-maha-846292.jpg',
    extraction: sampleReading(3, 94, { merchant: ['Al Maha Petroleum', 98], expenseDate: [dateDaysAgo(4), 96], receiptNo: ['846292', 95], grossAmount: ['18.750', 97], vatAmount: ['0.893', 93], category: ['Fuel', 90] }, 'cat-002'),
  }, { approvers: [P.fatma], submitted: daysAgo(3, '09:05') }),
  makeClaim(176, {
    beneficiaryId: P.ahmed, expenseDate: dateDaysAgo(18), categoryId: 'cat-009', payeeName: 'Cool Air Technical Services', receiptNo: 'CA-5521',
    description: 'Emergency repair of the server room air conditioning.', enteredAmount: 685, vatTreatment: 'inclusive',
    costLevel: 'department', costId: 'dep-it', createdAtUtc: daysAgo(18, '15:30'), receiptFile: 'cool-air-5521.pdf',
  }, { approvers: [P.fatma], submitted: daysAgo(18, '15:32'), decisions: [{ by: P.fatma, days: 17, time: '10:10', action: 'approve' }], paid: { days: 15, method: 'bankTransfer', voucher: '141', reference: 'FT2610031015' } }),

  // Others the approvers see
  makeClaim(185, {
    beneficiaryId: P.maryam, expenseDate: dateDaysAgo(4), categoryId: 'cat-003', payeeName: 'Lulu Hypermarket', receiptNo: 'LU-220931',
    description: 'Refreshments for the safety induction of 30 site workers.', enteredAmount: 57.33, vatTreatment: 'inclusive',
    costLevel: 'project', costId: 'prj-002', createdAtUtc: daysAgo(4, '17:22'), receiptFile: 'lulu-receipt.jpg',
  }, { approvers: [P.said, P.fatma], submitted: daysAgo(4, '17:25'), decisions: [{ by: P.said, days: 2, time: '10:15', action: 'return', comment: 'The receipt is cut off at the total. Please upload the full receipt.' }] }),
  makeClaim(183, {
    beneficiaryId: P.maryam, expenseDate: dateDaysAgo(6), categoryId: 'cat-002', vendorId: 'ven-001', receiptNo: '845117',
    description: 'Fuel for the CCTV survey trips to Barka.', enteredAmount: 21.3, vatTreatment: 'inclusive',
    costLevel: 'project', costId: 'prj-003', createdAtUtc: daysAgo(5, '08:12'), receiptFile: 'al-maha-845117.jpg',
  }, { approvers: [P.said, P.fatma], submitted: daysAgo(5, '08:15'), decisions: [{ by: P.said, days: 4, time: '09:35', action: 'approve' }] }),
];

/** Requests other than claims that wait in an approver's inbox. */
export interface OtherRequest {
  kind: Exclude<RequestKind, 'reimbursement'>;
  id: string;
  reference: string;
  status: RequestStatus;
  version: number;
  personId: string;
  createdById: string;
  submittedAtUtc: string;
  amount: number;
  level: AllocationLevel;
  unitId: string;
  purpose: string;
  categoryId?: string;
  date: string;
  route: RouteStep[];
  currentStep?: number;
  history: HistoryEntry[];
  flags: ApprovalFlag[];
}

function other(fields: Omit<OtherRequest, 'status' | 'version' | 'route' | 'currentStep' | 'history'>, flow: Flow): OtherRequest {
  const played = playFlow(flow, fields.createdById, fields.submittedAtUtc);
  return { ...fields, ...played, version: 1 };
}

export const initialOtherRequests: OtherRequest[] = [
  other({
    kind: 'preExpense', id: 'pea-41', reference: ref('PEA', 41), personId: P.hamed, createdById: P.hamed, submittedAtUtc: hoursAgo(5),
    amount: 35, level: 'department', unitId: 'dep-it', categoryId: 'cat-005', date: dateDaysAgo(-2),
    purpose: 'Courier of the replacement server disks from the Sohar warehouse.', flags: [],
  }, { approvers: itRoute, submitted: hoursAgo(5) }),
  other({
    kind: 'additionalCash', id: 'apr-15', reference: ref('APR', 15), personId: P.said, createdById: P.said, submittedAtUtc: daysAgo(4, '11:42'),
    amount: 400, level: 'project', unitId: 'prj-003', date: dateDaysAgo(2),
    purpose: 'Cameras for the last two buildings still need fixings, cable and courier.', flags: [],
  }, { approvers: [P.khalid, P.fatma], submitted: daysAgo(4, '11:42'), decisions: [{ by: P.khalid, days: 3, time: '09:10', action: 'approve' }] }),
];

export type Acknowledgement = AwaitingAcknowledgement & { method: PaymentMethod; paymentReference?: string; voucherNo: string; allocationReference: string; unitId: string };

export const initialAcknowledgements: Acknowledgement[] = [
  {
    kind: 'additionalCash', id: 'apr-13', reference: ref('APR', 13), allocationId: 'alc-31', allocationReference: ref('ALC', 31), unitId: 'dep-it',
    recipientId: P.ahmed, amount: 500, paidOn: dateDaysAgo(3), method: 'bankTransfer', paymentReference: 'FT2609291052', voucherNo: ref('PV', 144),
  },
];

const position = (seq: number, level: AllocationLevel, scopeId: string, custodianId: string, float: number, available: number, reserved = 0, watch = 35): AllocationPosition => {
  const percentLeft = Math.round((available / float) * 1000) / 10;
  return {
    id: `alc-${seq}`, reference: ref('ALC', seq), level, scopeId, custodianId, float, reserved, available, used: Math.round((float - available - reserved) * 1000) / 1000,
    percentLeft, watchThresholdPercent: watch, nearThresholdPercent: 20,
    band: available < 0 ? 'exceeded' : percentLeft <= 20 ? 'near' : percentLeft <= watch ? 'watch' : 'normal',
  };
};

export const initialPositions: AllocationPosition[] = [
  position(31, 'department', 'dep-it', P.ahmed, 3000, 1902.35),
  position(32, 'project', 'prj-002', P.maryam, 2500, 1320, 60),
  position(33, 'project', 'prj-003', P.said, 600, 73.6),
  position(34, 'department', 'dep-sales', P.fatmaHinai, 300, 110, 0, 40),
  position(35, 'project', 'prj-001', P.ahmed, 500, 500),
];
