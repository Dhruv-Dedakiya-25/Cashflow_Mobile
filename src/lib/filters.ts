import { useSyncExternalStore } from 'react';

import { monthStart, omanToday } from '@/mock/clock';

export type PeriodPreset = 'all' | 'thisMonth' | 'lastMonth' | 'last3' | 'last6' | 'thisYear';
/** A ready-made period, or dates the person chose (yyyy-mm-dd, both days included). */
export type Period = { preset: PeriodPreset } | { from: string; to: string };
export type DateRange = { from: string; to: string };

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The days a period covers; undefined means every date. Months are calendar months, this one included. */
export function periodRange(period: Period): DateRange | undefined {
  if (!('preset' in period)) return period;
  const today = omanToday();
  switch (period.preset) {
    case 'all':
      return undefined;
    case 'thisMonth':
      return { from: monthStart(0), to: today };
    case 'lastMonth':
      return { from: monthStart(1), to: addDays(monthStart(0), -1) };
    case 'last3':
      return { from: monthStart(2), to: today };
    case 'last6':
      return { from: monthStart(5), to: today };
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

export const inRange = (date: string, range: DateRange | undefined) => !range || (date >= range.from && date <= range.to);

/** True when every word typed is found in the texts, or begins the amount: 12.6 finds 12.600 and 12.650, not 412.650. */
export function matchesSearch(query: string, texts: (string | undefined)[], value?: number) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean).map((w) => (/^[\d.,]+$/.test(w) ? w.replace(/,/g, '') : w));
  if (!words.length) return true;
  const text = texts.filter(Boolean).join(' ').toLowerCase();
  const amountText = value?.toFixed(3);
  return words.every((w) => text.includes(w) || (!!amountText && /^[\d.]+$/.test(w) && amountText.startsWith(w)));
}

/** Reports and each report opened from it share one period and search, so moving between them keeps what was chosen. */
type ReportFilter = { period: Period; search: string };
let reportFilter: ReportFilter = { period: { preset: 'last6' }, search: '' };
const listeners = new Set<() => void>();

export function setReportFilter(change: Partial<ReportFilter>) {
  reportFilter = { ...reportFilter, ...change };
  listeners.forEach((l) => l());
}

export function useReportFilter() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => reportFilter,
  );
}
