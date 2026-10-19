/**
 * The CashFlow API's shapes the app uses, copied from the web app's types (src/types) and
 * trimmed to what the phone shows. Names follow the API's JSON: camelCase, ids as strings,
 * dates as ISO strings, enums by name, amounts in OMR to three decimals. The sample data
 * uses the same shapes, so moving a screen to the API changes where data comes from, not
 * the screen.
 */

export type RequestKind = 'reimbursement' | 'preExpense' | 'allocation' | 'additionalCash' | 'reallocation';

export type RequestStatus =
  | 'draft' | 'submitted' | 'inApproval' | 'returned' | 'approved' | 'rejected' | 'cancelled'
  | 'disbursed' | 'acknowledged' | 'closed' | 'paid';

export type CostLevel = 'department' | 'businessUnit' | 'project';
export type AllocationLevel = CostLevel | 'custodian';
export type SettlementMethod = 'pettyCash' | 'salary';
export type VatTreatment = 'inclusive' | 'exclusive' | 'none';
export type PaymentMethod = 'cash' | 'bankTransfer' | 'cheque' | 'salary';
export type ThresholdBand = 'pending' | 'normal' | 'watch' | 'near' | 'exceeded';

/** pending: waiting for a decision now; waiting: not reached yet. */
export type StepState = 'waiting' | 'pending' | 'approved' | 'skipped' | 'returned' | 'rejected';
export type SkipReason = 'noProject' | 'belowAmount' | 'selfApproval' | 'alreadyApproved';

/** One step of the route a request was given when it was submitted. */
export interface RouteStep {
  stepId: string;
  approvalMode: 'any' | 'all';
  slaHours: number;
  approverIds: string[];
  state: StepState;
  skipReason?: SkipReason;
  approvedByIds: string[];
  startedAtUtc?: string;
  decidedAtUtc?: string;
}

export type HistoryAction =
  | 'created' | 'edited' | 'submitted' | 'resubmitted' | 'approved' | 'returned' | 'rejected'
  | 'cancelled' | 'disbursed' | 'acknowledged' | 'paid' | 'closed';

export interface HistoryEntry {
  id: string;
  atUtc: string;
  actorId: string;
  action: HistoryAction;
  version: number;
  stepIndex?: number;
  comment?: string;
}

export interface AttachmentInfo {
  documentId?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256?: string;
  uploadedAtUtc: string;
  uploadedById: string;
}

export type ExtractedField = 'merchant' | 'receiptNo' | 'expenseDate' | 'grossAmount' | 'vatAmount' | 'category';

export interface ExtractedValue {
  value: string;
  /** How sure the reading was, in percent. */
  confidence: number;
}

export interface ReceiptExtraction {
  provider: string;
  model: string;
  extractedAtUtc: string;
  confidence: number;
  fields: Partial<Record<ExtractedField, ExtractedValue>>;
  categoryId?: string;
}

export interface PaymentRecord {
  voucherNo: string;
  method: PaymentMethod;
  reference?: string;
  paidOn: string;
  amount: number;
  paidById: string;
  recordedAtUtc: string;
}

/** A claim as the API returns it. */
export interface ReimbursementView {
  id: string;
  reference: string;
  status: RequestStatus;
  version: number;
  createdById: string;
  createdAtUtc: string;
  submittedAtUtc?: string;
  route: RouteStep[];
  currentStep?: number;
  history: HistoryEntry[];
  beneficiaryId: string;
  basis: 'direct' | 'preApproved';
  preExpenseId?: string;
  preExpenseReference?: string;
  expenseDate: string;
  categoryId: string;
  vendorId?: string;
  payeeName?: string;
  receiptNo?: string;
  description: string;
  enteredAmount: number;
  vatTreatment: VatTreatment;
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
  costLevel: CostLevel;
  costId: string;
  settlement: SettlementMethod;
  receipt?: AttachmentInfo;
  extraction?: ReceiptExtraction;
  allocationReference?: string;
  payment?: PaymentRecord;
}

/** An acknowledged allocation against its float: used + reserved + available = float. */
export interface AllocationPosition {
  id: string;
  reference: string;
  level: AllocationLevel;
  scopeId: string;
  custodianId: string;
  float: number;
  used: number;
  reserved: number;
  available: number;
  percentLeft: number | null;
  band: ThresholdBand;
  watchThresholdPercent: number;
  nearThresholdPercent: number;
}

/** Cash paid out and not yet acknowledged by the person who received it. */
export interface AwaitingAcknowledgement {
  kind: 'allocation' | 'additionalCash';
  id: string;
  reference: string;
  allocationId: string;
  recipientId: string;
  amount: number;
  paidOn: string;
}

export type ApprovalFlag = 'duplicate' | 'changed' | 'overAvailable' | 'onBehalf' | 'lowConfidence';

/** One request as the Approval Inbox lists it, whatever its kind. */
export interface ApprovalItem {
  kind: RequestKind;
  id: string;
  reference: string;
  status: RequestStatus;
  version: number;
  personId: string;
  createdById: string;
  submittedAtUtc?: string;
  amount: number;
  level: AllocationLevel;
  unitId: string;
  purpose: string;
  currentStep?: { index: number; step: RouteStep };
  canDecide: boolean;
  flags: ApprovalFlag[];
}

/** A request on My Dashboard. */
export interface MyRequest {
  kind: 'preExpense' | 'reimbursement';
  id: string;
  reference: string;
  date: string;
  purpose: string;
  amount: number;
  status: RequestStatus;
  beneficiaryId: string;
  createdById: string;
  hasReceipt: boolean;
  waitingForIds?: string[];
}

export interface MyDashboard {
  approvedAvailable: number;
  approvedCount: number;
  awaitingCount: number;
  awaitingAmount: number;
  returnedCount: number;
  paidThisMonth: number;
  paidThisMonthCount: number;
  recent: MyRequest[];
  approvals?: { items: ApprovalItem[]; total: number; overdue: number };
  custodian: { position: AllocationPosition }[];
  toAcknowledge: AwaitingAcknowledgement[];
  /** The person's own claims over the last 6 months, oldest first. */
  months: { month: string; pettyCash: number; salary: number; pending: number }[];
  /** The person's own claims dated this year, by category, largest first. */
  categories: { categoryId: string; amount: number; count: number }[];
}

/** Master data the screens name things with, in English and Arabic as the API keeps them. */
export interface Person {
  id: string;
  nameEn: string;
  nameAr: string;
  designation: string;
  departmentId: string;
}

export interface NamedRecord {
  id: string;
  nameEn: string;
  nameAr: string;
}
