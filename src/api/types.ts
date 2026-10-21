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
  /** The version the server last saved, sent back with a change so two edits cannot overwrite each other. */
  stamp?: string;
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
  /** The last decision the signed-in person made on it, if any. */
  myDecision?: { action: 'approved' | 'returned' | 'rejected'; atUtc: string };
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

// ---- Sign-in -------------------------------------------------------------------------

export type AuthenticatorApp = 'google' | 'microsoft';

/** The signed-in user, as /api/Auth/me and every sign-in step return it. */
export interface AuthUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  isActive: boolean;
  roles: string[];
  roleId?: string;
  employeeId?: string;
  employeeCode?: string;
  companyId?: string;
  dataScope?: string;
  /** An administrator chose the password: nothing else works until it is changed. */
  mustChangePassword?: boolean;
  /** The role's rights in the Permission Matrix: module → actions, such as Reports → ["view"]. */
  grants: Record<string, string[]>;
  /** "disburser", "recipient": the person's entries on Disbursers & Recipients. */
  cashRoles: string[];
}

/** A started session, the same as the web receives. */
export interface LoginSession {
  accessToken: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  isPersistent: boolean;
  user: AuthUser;
  /** Only when 2FA was set up during this sign-in: shown once, never kept. */
  recoveryCodes?: string[];
}

/** What /api/AppAuth returns for a session: the web's session plus the tokens the app keeps. */
export interface AppSession {
  session: LoginSession;
  refreshToken: string;
  trustedDeviceToken?: string;
}

/** What a correct password earns when 2FA applies: a five-minute challenge for the code step. */
export interface TwoFactorChallenge {
  /** `code` to enter a code; `enroll` to set an authenticator up first. */
  kind: 'code' | 'enroll';
  challengeToken: string;
  expiresAtUtc: string;
  recoveryCodesAllowed: boolean;
  trustedDeviceAllowed: boolean;
  trustedDeviceDays: number;
  authenticators: AuthenticatorApp[];
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
  account: string;
  periodSeconds: number;
}

/** The signed-in person's own 2FA, from /api/TwoFactor/getMyTwoFactor. */
export interface MyTwoFactor {
  enrolledAtUtc?: string;
  required: boolean;
  recoveryCodesLeft: number;
}

// ---- Lists and settings ----------------------------------------------------------------

/** One record in a /api/Lookup/getOptions list: an employee, unit, category or vendor. */
export interface LookupOption {
  value: string;
  label: string;
  labelAr?: string;
  /** The employee ID, such as EMP-0029. */
  code?: string;
  /** The record it belongs to: an employee's department, a department's business unit. */
  parent?: string;
  disabled?: boolean;
}

export interface LanguageSetting {
  code: string;
  isEnabled: boolean;
}

/** The Finance Dashboard, trimmed to Home's company card. */
export interface FinanceDashboard {
  floats: number;
  floatCount: number;
  available: number;
  availablePercent: number | null;
  toPay: number;
  toPayCount: number;
  positions: AllocationPosition[];
}

// ---- Claims ----------------------------------------------------------------------------

/** The fields a person enters for a claim; the server works out net, VAT and gross. */
export interface ClaimInput {
  beneficiaryId: string;
  basis: 'direct' | 'preApproved';
  preExpenseId?: string;
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
  settlement: SettlementMethod;
  receipt?: AttachmentInfo;
}

type UnitsByLevel = Record<CostLevel, string[]>;

/** What /api/Reimbursement/getClaimOptions allows the person, and the rules a claim must meet. */
export interface ClaimOptions {
  beneficiaryIds: string[];
  /** Where the person may charge a claim. */
  costUnits: UnitsByLevel;
  /** Of those, the units with petty cash to pay from. */
  fundedUnits: UnitsByLevel;
  preApprovals: { id: string; reference: string; remaining: number; amount: number; purpose: string; costLevel: CostLevel; costId: string }[];
  requireReceipt: boolean;
  receiptCategoryIds: string[];
  vatRate: number;
  requireActiveAllocation: boolean;
  preventNegativeBalance: boolean;
  /** For each funded unit, the allocation a petty-cash claim there draws on. */
  allocations: { costLevel: CostLevel; unitId: string; allocationId: string; reference: string; available: number }[];
}

/** A stored upload, as /api/Document/uploadDocument returns it. */
export interface DocumentView {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAtUtc: string;
  uploadedById: string;
}

/** The upload rules and AI reading settings, from /api/Document/getDocumentOptions. */
export interface DocumentOptions {
  allowedFileTypes: string[];
  maxUploadMb: number;
  extractionEnabled: boolean;
  minConfidence: number;
  timeoutSeconds: number;
  maxRetries: number;
}

// ---- Approvals and acknowledgements -----------------------------------------------------

/** A field corrected after the last return: what the approver saw, and what it is now. */
export interface FieldChange {
  /** The web's key for the field's label, such as "pages:reimb.field.description". */
  field: string;
  from?: string;
  to: string;
  /** A key prefix when the values are codes to translate. */
  codes?: string;
}

/** Any request's route and history, whatever its kind. */
export interface RequestRecord {
  id: string;
  reference: string;
  route: RouteStep[];
  currentStep?: number;
  history: HistoryEntry[];
}

/** Everything the review screen shows: the request, what changed since it was returned, and the cash it draws on. */
export interface ApprovalReview {
  item: ApprovalItem;
  request: { kind: 'reimbursement'; record: ReimbursementView } | { kind: Exclude<RequestKind, 'reimbursement'>; record: RequestRecord };
  changes: FieldChange[];
  lastReturn?: HistoryEntry;
  allocation?: { id: string; reference: string; available: number };
}

/** Cash paid out to a custodian, or handed over to them, as /api/Acknowledgement lists it. */
export interface AcknowledgementItem {
  kind: 'allocation' | 'additionalCash' | 'handover';
  id: string;
  reference: string;
  allocationId: string;
  allocationReference: string;
  level: AllocationLevel;
  scopeId: string;
  recipientId: string;
  amount: number;
  status: RequestStatus;
  issuedOn: string;
  payment?: PaymentRecord;
  reallocatedFrom?: { reference: string; byId: string };
  /** Present once the recipient has confirmed receiving it. */
  acknowledgement?: { atUtc: string; remarks?: string };
  purpose: string;
}

// ---- Reports ---------------------------------------------------------------------------

/** One figure per period: a day or a month, in the order of the buckets' keys. */
export interface ReportTrend {
  amount: number[];
  count: number[];
  paid: number[];
  pending: number[];
}

/** The money on a set of claims: claimed = paid + pending. */
export interface ClaimFigures {
  claims: number;
  claimed: number;
  paid: number;
  pending: number;
}

/** One row of a summary report, whichever it is: the fields a report does not have are absent. */
export interface ReportRow extends ClaimFigures {
  key: string;
  people: number;
  categoryId?: string;
  unitId?: string;
  employeeId?: string;
  vendorId?: string;
  payeeName?: string;
  /** Category: share of everything claimed, in percent. */
  share?: number;
  /** Department and project: acknowledged in the period, and available now. */
  allocated?: number;
  available?: number;
  /** Employee: approved so far, paid or not. */
  approved?: number;
}

export interface GroupReport {
  buckets: { unit: 'day' | 'month'; keys: string[] };
  rows: ReportRow[];
  totals: ClaimFigures & { people: number; allocated?: number | null; available?: number | null };
  trend: ReportTrend;
}

/** One claim in the Transactions report. */
export interface TransactionRow {
  id: string;
  reference: string;
  expenseDate: string;
  beneficiaryId: string;
  vendorId?: string;
  payeeName?: string;
  categoryId: string;
  costLevel: CostLevel;
  costId: string;
  reportStatus: 'inApproval' | 'approved' | 'paid';
  settlement: SettlementMethod;
  paidOn?: string;
  voucherNo?: string;
  net: number;
  vat: number;
  gross: number;
}

export interface TransactionReport {
  buckets: { unit: 'day' | 'month'; keys: string[] };
  rows: TransactionRow[];
  totals: ClaimFigures & { net: number; vat: number };
  trend: ReportTrend;
  page?: number;
  pageSize?: number;
  totalRows?: number;
}
