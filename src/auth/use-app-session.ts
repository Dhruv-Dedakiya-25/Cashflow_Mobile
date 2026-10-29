import { holds } from '@/api/live';
import type { AuthUser } from '@/api/types';
import { authMode } from '@/config';
import type { Persona } from '@/mock/master';
import { useMockState } from '@/mock/store';

import { useAuth } from './session';

/**
 * The sample persona whose screens a live user sees on the tabs that still show sample data:
 * Finance for those who settle claims, a manager for those who approve, else an employee.
 */
export const personaFor = (user: AuthUser): Persona =>
  holds(user, 'FinanceSettlement') ? 'finance' : holds(user, 'ApprovalInbox') ? 'manager' : 'employee';

/** Who is signed in, the same way in both modes: the live user, or the demo persona. */
export function useAppSession() {
  const auth = useAuth();
  const { session } = useMockState();
  if (authMode === 'api') {
    const user = auth.status === 'signedIn' ? auth.user : undefined;
    return { starting: auth.status === 'starting', signedIn: !!user, user, mustChangePassword: !!user?.mustChangePassword };
  }
  return { starting: false, signedIn: !!session, user: undefined, mustChangePassword: false };
}

/** Kinds of request someone may decide, by the right that decides them, as on the web. */
const DECIDING_MODULES = ['Allocations', 'AdditionalCash', 'PreExpense', 'Reimbursements', 'Reallocations'];

/**
 * Whether the person decides requests of any kind: the live user's role, or any demo persona but
 * the employee. The Inbox right alone is not enough: employees hold it to see what came back to them.
 */
export function useApproves() {
  const { user } = useAppSession();
  const { session } = useMockState();
  return user ? DECIDING_MODULES.some((m) => holds(user, m, 'approve')) : !!session && session.persona !== 'employee';
}
