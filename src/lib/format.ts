import type { AuthUser, CostLevel, LookupOption, NamedRecord, Person } from '@/api/types';
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

/** A share to one decimal, as the web shows it: 8.716… becomes 8.7%. */
export const percent = (value: number, code: string) => {
  try {
    return `${new Intl.NumberFormat(locale(code), { maximumFractionDigits: 1 }).format(value)}%`;
  } catch {
    return `${Math.round(value * 10) / 10}%`;
  }
};

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

// The real records from /api/Lookup, once signed in to the live API. Their ids are GUIDs and the
// sample's are "emp-0029" and the like, so one list can answer for both.
type Unit = NamedRecord & { level: CostLevel };
const live = {
  people: new Map<string, Person>(),
  units: new Map<string, Unit>(),
  categories: new Map<string, NamedRecord>(),
  vendors: new Map<string, NamedRecord>(),
  roles: new Map<string, NamedRecord>(),
  /** The records a new claim may still choose: deactivated ones only name old values. */
  activeCategories: [] as NamedRecord[],
  activeVendors: [] as NamedRecord[],
};

const named = (o: LookupOption): NamedRecord => ({ id: o.value, nameEn: o.label, nameAr: o.labelAr ?? o.label });

/** Puts the live lists beside the sample ones. An employee's role title is not in the list, so it stays empty. */
export function setLiveLookups(lists: Record<'employee' | 'businessUnit' | 'department' | 'project' | 'category' | 'vendor' | 'role', LookupOption[]>) {
  live.people = new Map(lists.employee.map((o) => [o.value, { ...named(o), designation: '', departmentId: o.parent ?? '' }]));
  live.units = new Map(
    (['businessUnit', 'department', 'project'] as const).flatMap((level) => lists[level].map((o) => [o.value, { ...named(o), level }] as const)),
  );
  live.categories = new Map(lists.category.map((o) => [o.value, named(o)]));
  live.vendors = new Map(lists.vendor.map((o) => [o.value, named(o)]));
  live.roles = new Map(lists.role.map((o) => [o.value, named(o)]));
  live.activeCategories = lists.category.filter((o) => !o.disabled).map(named);
  live.activeVendors = lists.vendor.filter((o) => !o.disabled).map(named);
}

/** The categories a new claim may use: the live ones once loaded, else the sample's. */
export const categoryChoices = () => (live.activeCategories.length ? live.activeCategories : categories);

/** A typed merchant as a claim records it: the Vendor Master entry whose name matches, in either language, else the name. */
export function payeeOf(text: string): { vendorId?: string; payeeName?: string } {
  const typed = text.trim();
  if (!typed) return {};
  const match = (live.activeVendors.length ? live.activeVendors : vendors).find((v) =>
    [v.nameEn, v.nameAr].some((n) => n?.trim().toLowerCase() === typed.toLowerCase()),
  );
  return match ? { vendorId: match.id } : { payeeName: typed };
}

export const person = (id: string) => live.people.get(id) ?? people.find((p) => p.id === id);
export const category = (id: string) => live.categories.get(id) ?? categories.find((c) => c.id === id);
export const unit = (id: string) => live.units.get(id) ?? units.find((u) => u.id === id);
export const vendor = (id?: string) => (id ? live.vendors.get(id) : undefined) ?? vendors.find((v) => v.id === id);
export const role = (id?: string) => (id ? live.roles.get(id) : undefined);

/** The signed-in person: their employee record's name, else the account's, and the id their avatar colour follows. */
export function accountOf(user: AuthUser, code: string) {
  const employee = user.employeeId ? person(user.employeeId) : undefined;
  const fallback = user.displayName || user.username;
  return { name: (employee && nameOf(employee, code)) || fallback, nameEn: employee?.nameEn || fallback, id: user.employeeId ?? user.id, employee };
}

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
