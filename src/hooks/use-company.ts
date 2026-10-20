import { useMemo } from 'react';

import { holds, useFinanceDashboard } from '@/api/live';
import { useAppSession } from '@/auth/use-app-session';
import { companySummary, financeSummary, useMockState, useSession } from '@/mock/store';

/**
 * Petty cash across the company, for those who may see the Finance Dashboard: its live figures,
 * or the sample's for the demo's Finance persona. Undefined for everyone else.
 */
export function useCompany() {
  const { user } = useAppSession();
  const state = useMockState();
  const { persona } = useSession();
  const query = useFinanceDashboard(!!user && holds(user, 'Dashboard'));
  const summary = useMemo(() => {
    if (user) return query.data ? companySummary(query.data.positions, query.data.toPayCount, query.data.toPay) : undefined;
    return persona === 'finance' ? financeSummary(state) : undefined;
  }, [user, query.data, persona, state]);
  return { summary, query };
}
