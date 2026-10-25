/** The live screens' data from the CashFlow API, cached so a screen opens at once and refreshes behind. */
import { focusManager, keepPreviousData, QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { updateUser } from '@/auth/session';
import { authMode } from '@/config';
import { setLiveLookups } from '@/lib/format';
import { monthStart, omanToday } from '@/mock/clock';

import { ApiError, apiDataUri, apiGet, apiPost, apiPut, apiUpload, type PhoneFile } from './client';
import type {
  AcknowledgementItem, ApprovalItem, ApprovalReview, AttachmentInfo, AuthUser, GroupReport, TransactionReport, ClaimFinanceInput, ClaimInput, ClaimOptions, DocumentOptions, DocumentView, FinanceDashboard, LanguageSetting, LookupOption,
  MyDashboard, MyTwoFactor, PaymentMethod, ReceiptExtraction, ReimbursementView, RequestKind,
} from './types';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Coming back to the app counts as focus, as a browser tab does, so stale lists refresh then.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => subscription.remove();
  });
}

// Out of reach: the last request could not reach the server, until one gets through again.
let offline = false;
const offlineListeners = new Set<() => void>();
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'updated') return;
  const { action } = event;
  const next = action.type === 'error' ? action.error instanceof ApiError && action.error.status === 0 : action.type === 'success' ? false : offline;
  if (next === offline) return;
  offline = next;
  offlineListeners.forEach((l) => l());
});

/** True while the server cannot be reached, so screens can say that what they show may be out of date. */
export const useOffline = () =>
  useSyncExternalStore(
    (listener) => {
      offlineListeners.add(listener);
      return () => offlineListeners.delete(listener);
    },
    () => offline,
  );

const live = authMode === 'api';

export const useMyDashboard = () =>
  useQuery({ queryKey: ['myDashboard'], queryFn: () => apiGet<MyDashboard>('/Dashboard/getMyDashboard'), enabled: live });

/** The company's petty cash this month, for people whose role may see the Finance Dashboard. */
export const useFinanceDashboard = (allowed: boolean) =>
  useQuery({
    queryKey: ['financeDashboard'],
    queryFn: () => apiGet<FinanceDashboard>(`/Dashboard/getFinanceDashboard?from=${monthStart(0)}&to=${omanToday()}`),
    enabled: live && allowed,
  });

const lists = ['employee', 'businessUnit', 'department', 'project', 'category', 'vendor', 'role'] as const;

/** The names behind the ids every screen shows, loaded once after signing in. */
export const useLookups = (signedIn: boolean) =>
  useQuery({
    queryKey: ['lookups'],
    queryFn: async () => {
      const loaded = await Promise.all(lists.map((list) => apiGet<LookupOption[]>(`/Lookup/getOptions/${list}`)));
      setLiveLookups(Object.fromEntries(lists.map((list, i) => [list, loaded[i]])) as Parameters<typeof setLiveLookups>[0]);
      return true;
    },
    enabled: live && signedIn,
    staleTime: 10 * 60_000,
  });

/** The languages the administrator has switched on. Readable before signing in. */
export const useEnabledLanguages = () =>
  useQuery({
    queryKey: ['languages'],
    queryFn: async () => (await apiGet<LanguageSetting[]>('/Language/getLanguages')).filter((l) => l.isEnabled).map((l) => l.code),
    enabled: live,
    staleTime: 10 * 60_000,
  });

export const useMyTwoFactor = () =>
  useQuery({ queryKey: ['myTwoFactor'], queryFn: () => apiGet<MyTwoFactor>('/TwoFactor/getMyTwoFactor'), enabled: live });

/** Re-reads the signed-in user, so a change to the role's rights shows in the tabs at once. */
export async function refreshMe() {
  await updateUser(await apiGet<AuthUser>('/Auth/me'));
}

/** Ends every session on success, this one included, so the person signs in again with the new password. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiPost<void>('/User/changePassword', { currentPassword, newPassword });

// ---- Claims ----------------------------------------------------------------------------

/** Every claim the person may see: their own, and their team's for those who approve. */
export const useClaims = () =>
  useQuery({ queryKey: ['claims'], queryFn: () => apiGet<ReimbursementView[]>('/Reimbursement/getReimbursement'), enabled: live });

/** One claim, shown at once from the list when it is there, and read fresh behind. */
export const useClaim = (id: string) =>
  useQuery({
    queryKey: ['claim', id],
    queryFn: () => apiGet<ReimbursementView>(`/Reimbursement/getReimbursement/${id}`),
    initialData: () => queryClient.getQueryData<ReimbursementView[]>(['claims'])?.find((c) => c.id === id),
    enabled: live && !!id,
  });

/** Where the person may charge a claim and the rules it must meet; `editingId` leaves that claim out of the sums. */
export const useClaimOptions = (beneficiaryId: string | undefined, editingId?: string) =>
  useQuery({
    queryKey: ['claimOptions', beneficiaryId, editingId],
    queryFn: () =>
      apiGet<ClaimOptions>(`/Reimbursement/getClaimOptions?beneficiaryId=${beneficiaryId}${editingId ? `&editingId=${editingId}` : ''}`),
    enabled: live && !!beneficiaryId,
  });

export const useDocumentOptions = () =>
  useQuery({ queryKey: ['documentOptions'], queryFn: () => apiGet<DocumentOptions>('/Document/getDocumentOptions'), enabled: live, staleTime: 10 * 60_000 });

/** A receipt image, fetched with the session, as a data URI the screen can show. */
export const useReceiptImage = (documentId: string | undefined) =>
  useQuery({
    queryKey: ['receiptImage', documentId],
    queryFn: () => apiDataUri(`/Document/getDocument/${documentId}`),
    enabled: live && !!documentId,
    staleTime: Infinity,
  });

export const uploadReceipt = (file: PhoneFile) => apiUpload<DocumentView>('/Document/uploadDocument', file);

/** The upload as a claim's receipt. */
export const asReceipt = (d: DocumentView): AttachmentInfo => ({
  documentId: d.id,
  fileName: d.fileName,
  contentType: d.contentType,
  sizeBytes: d.sizeBytes,
  sha256: d.sha256,
  uploadedAtUtc: d.uploadedAtUtc,
  uploadedById: d.uploadedById,
});

/**
 * Has AI read a stored receipt. The reader may wait for the model and retry, so the request
 * waits as long as AI & Document Processing allows, with a margin, as the web does.
 */
export const readReceipt = (documentId: string, options: DocumentOptions) => {
  const seconds = options.timeoutSeconds * (options.maxRetries + 1) + 4 * options.maxRetries + 10;
  return apiPost<ReceiptExtraction>(`/Document/readDocument/${documentId}`, undefined, seconds * 1000);
};

/** Saves and sends a claim for approval: a new one, or a returned one corrected. */
export async function submitClaim(input: ClaimInput, editing?: ReimbursementView): Promise<ReimbursementView> {
  const saved = editing
    ? await apiPut<ReimbursementView>(`/Reimbursement/updateReimbursement/${editing.id}`, { ...input, submit: true, stamp: editing.stamp })
    : await apiPost<ReimbursementView>('/Reimbursement/createReimbursement', { ...input, submit: true });
  queryClient.setQueryData(['claim', saved.id], saved);
  // The lists, the dashboard and the sums the next claim is checked against have all moved.
  void queryClient.invalidateQueries({ queryKey: ['claims'] });
  void queryClient.invalidateQueries({ queryKey: ['myDashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['claimOptions'] });
  return saved;
}

// ---- Approvals and acknowledgements -----------------------------------------------------

/** The Approval Inbox: everything the person has been part of; the screen shows what they can decide now. */
export const useInbox = (enabled = true) =>
  useQuery({ queryKey: ['inbox'], queryFn: () => apiGet<ApprovalItem[]>('/Approval/getApprovalInbox'), enabled: live && enabled });

export const useReview = (kind: RequestKind, id: string) =>
  useQuery({ queryKey: ['review', kind, id], queryFn: () => apiGet<ApprovalReview>(`/Approval/getApprovalReview/${kind}/${id}`), enabled: live && !!id });

export type Decision = 'approve' | 'return' | 'reject';

/**
 * Decides the waiting step. The version the person saw goes with it, so a request changed or decided
 * by someone else in the meantime is refused, with the server's reason, instead of decided blind.
 */
/** A decision on the waiting step; Finance's approval of a claim also carries what it settled. */
export async function decide(item: ApprovalItem, decision: Decision, comment?: string, claim?: ClaimFinanceInput) {
  const result = await apiPost<ApprovalItem>(`/Approval/decide/${item.kind}/${item.id}`, { version: item.version, decision, comment, claim }).catch((e) => {
    // Refused because it moved on: the Inbox is out of date, so it reloads behind the message.
    void queryClient.invalidateQueries({ queryKey: ['inbox'] });
    throw e;
  });
  for (const key of ['inbox', 'review', 'myDashboard', 'claims', 'financeDashboard']) void queryClient.invalidateQueries({ queryKey: [key] });
  return result;
}

export const useAcknowledgements = (enabled = true) =>
  useQuery({ queryKey: ['acknowledgements'], queryFn: () => apiGet<AcknowledgementItem[]>('/Acknowledgement/getAcknowledgements'), enabled: live && enabled });

/** Confirms the cash arrived; it then counts in the allocation's balance, and this cannot be undone. */
export async function acknowledge(item: Pick<AcknowledgementItem, 'kind' | 'id'>, remarks?: string) {
  await apiPost<void>(`/Acknowledgement/acknowledge/${item.kind}/${item.id}`, { remarks: remarks || undefined });
  for (const key of ['acknowledgements', 'myDashboard', 'financeDashboard', 'inbox']) void queryClient.invalidateQueries({ queryKey: [key] });
}

/** Cash to acknowledge as the Inbox and its screen show it, the same for the sample and the API. */
export interface AckView {
  id: string;
  kind: AcknowledgementItem['kind'];
  reference: string;
  amount: number;
  allocationReference: string;
  unitId: string;
  paidOn: string;
  method?: PaymentMethod;
  paymentReference?: string;
  voucherNo?: string;
  reallocatedFrom?: { reference: string; byId: string };
}

export const toAckView = (a: AcknowledgementItem): AckView => ({
  id: a.id,
  kind: a.kind,
  reference: a.reference,
  amount: a.amount,
  allocationReference: a.allocationReference,
  unitId: a.scopeId,
  paidOn: a.payment?.paidOn ?? a.issuedOn,
  method: a.payment?.method,
  paymentReference: a.payment?.reference,
  voucherNo: a.payment?.voucherNo,
  reallocatedFrom: a.reallocatedFrom,
});

/** What the cash is: a new allocation, a top-up of one, or one handed over from someone else. */
export const ackTitle = (t: (key: string, options?: Record<string, unknown>) => string, a: AckView) =>
  a.kind === 'additionalCash'
    ? t('web:ack.kind.topUpOf', { reference: a.allocationReference })
    : a.kind === 'handover'
      ? t('web:ack.kind.reallocatedFrom', { reference: a.reallocatedFrom?.reference ?? a.allocationReference })
      : `${t('web:ack.kind.allocation')} · ${a.allocationReference}`;

// ---- Reports ---------------------------------------------------------------------------

export type SummaryView = 'category' | 'department' | 'project' | 'employee' | 'vendor';
type Range = { from: string; to: string };

const reportPath = (view: string, range: Range, search: string, extra = '') =>
  `/Report/${view}?from=${range.from}&to=${range.to}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}${extra}`;

/** A summary report for the period and search; the last answer stays on screen while a new one loads. */
export const useReport = (view: SummaryView, range: Range, search: string, enabled = true) =>
  useQuery({
    queryKey: ['report', view, range.from, range.to, search.trim()],
    queryFn: () => apiGet<GroupReport>(reportPath(view, range, search)),
    enabled: live && enabled,
    placeholderData: keepPreviousData,
  });

/** Every claim in the period, fifty at a time, as the API pages them. */
export const useTransactions = (range: Range, search: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['report', 'transactions', range.from, range.to, search.trim()],
    queryFn: ({ pageParam }) => apiGet<TransactionReport>(reportPath('transactions', range, search, `&page=${pageParam}`)),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      return last.totalRows && loaded < last.totalRows ? pages.length + 1 : undefined;
    },
    enabled: live && enabled,
  });

/**
 * The whole report for a file: an export returns every row, unpaged, and the API records it in the
 * Audit Log as the web's exports are, with the note saying what was exported.
 */
export const exportReport = <T,>(view: SummaryView | 'transactions', range: Range, search: string, format: 'pdf' | 'excel', note: string) =>
  apiGet<T>(reportPath(view, range, search, `&export=${format}&exportNote=${encodeURIComponent(note)}`));

/** Whether the role holds a right in the Permission Matrix, as the web menu decides. */
export const holds = (user: AuthUser, module: string, action = 'view') => !!user.grants?.[module]?.includes(action);
