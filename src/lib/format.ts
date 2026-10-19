import type { NamedRecord, Person } from '@/api/types';
import { categories, people, units, vendors } from '@/mock/master';

// Latin digits in every language, as the web app and Omani receipts use them.
const locale = (code: string) => `${code}-u-nu-latn`;

const numberFormats = new Map<string, Intl.NumberFormat>();

/** An amount in OMR with three decimals, for example 1,902.350. */
export function amount(value: number, code: string): string {
  let f = numberFormats.get(code);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale(code), { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } catch {
      f = new Intl.NumberFormat('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    numberFormats.set(code, f);
  }
  return f.format(value);
}

export const omr = (value: number, code: string) => `OMR ${amount(value, code)}`;

function dateFormat(code: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale(code), options);
  } catch {
    return new Intl.DateTimeFormat('en', options);
  }
}

/** yyyy-mm-dd or an ISO moment as "16 Oct". */
export const shortDate = (value: string, code: string) =>
  dateFormat(code, { day: 'numeric', month: 'short', timeZone: 'Asia/Muscat' }).format(new Date(value.length === 10 ? `${value}T08:00:00Z` : value));

/** yyyy-mm-dd as "16 Oct 2026". */
export const longDate = (value: string, code: string) =>
  dateFormat(code, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(value.length === 10 ? `${value}T08:00:00Z` : value));

/** An ISO moment as "16 Oct, 09:05" in Oman time. */
export const dateTime = (value: string, code: string) =>
  dateFormat(code, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Muscat' }).format(new Date(value));

/** yyyy-mm-01 as "Oct". */
export const monthName = (value: string, code: string) => dateFormat(code, { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

/** yyyy-mm-01 as "October 2026". */
export const monthYear = (value: string, code: string) => dateFormat(code, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

/** 0 for Sunday to 6 for Saturday, as "S", "M"… */
export const weekdayLetter = (day: number, code: string) => dateFormat(code, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + day)));

/** Master data keeps English and Arabic names; Arabic is shown only in Arabic. */
export const nameOf = (record: NamedRecord | Person | undefined, code: string) => (record ? (code === 'ar' ? record.nameAr : record.nameEn) : '');

export const person = (id: string) => people.find((p) => p.id === id);
export const category = (id: string) => categories.find((c) => c.id === id);
export const unit = (id: string) => units.find((u) => u.id === id);
export const vendor = (id?: string) => vendors.find((v) => v.id === id);

export const initials = (name: string) =>
  name
    .split(' ')
    .filter((w) => w && w !== 'Al' && w !== 'al')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Hours or days since a moment, as a number and its unit, for web:approval.hours / days. */
export function sinceParts(iso: string): { count: number; unit: 'hours' | 'days' } {
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 3600_000));
  return hours < 48 ? { count: hours, unit: 'hours' } : { count: Math.round(hours / 24), unit: 'days' };
}
