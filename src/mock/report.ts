// Report sample: six months of the company's claims, made up the same way every time and dated back from today.
import type { CostLevel, ReimbursementView, SettlementMethod } from '@/api/types';
import { inRange, matchesSearch, periodRange, type Period, type PeriodPreset } from '@/lib/filters';
import { category, nameOf, person, unit, vendor } from '@/lib/format';

import { dateDaysAgo } from './clock';
import { initialClaims, ref } from './data';
import { P, type Persona } from './master';

/** One claim counted in a report, as the API's transaction rows give it, cut to what the app shows. */
export interface ReportLine {
  id: string;
  reference: string;
  expenseDate: string;
  beneficiaryId: string;
  vendorId?: string;
  payeeName?: string;
  categoryId: string;
  costLevel: CostLevel;
  costId: string;
  status: 'inApproval' | 'approved' | 'paid';
  settlement: SettlementMethod;
  gross: number;
  description: string;
}

export type ReportView = 'category' | 'department' | 'project' | 'employee' | 'vendor' | 'transactions';

type Spend = { min: number; max: number; vendorId?: string; payees?: string[]; texts: string[] };
const spend: Record<string, Spend> = {
  'cat-001': { min: 2, max: 12, vendorId: 'ven-003', texts: ['Taxi to the Ministry of Labour', 'Taxi to a client meeting in Al Khuwair', 'Taxi from the airport after a site visit'] },
  'cat-002': { min: 8, max: 25, vendorId: 'ven-001', texts: ['Fuel for the site visit to Sohar', 'Fuel for the pool car', 'Fuel for delivery runs'] },
  'cat-003': { min: 4, max: 30, payees: ['Al Bustan Café', 'Kargeen Restaurant'], texts: ['Lunch for the visiting auditors', 'Refreshments for the team meeting', 'Working dinner during month-end close'] },
  'cat-004': { min: 5, max: 60, vendorId: 'sup-002', texts: ['Printer toner and A4 paper', 'Whiteboard markers and files', 'Desk organisers for new joiners'] },
  'cat-005': { min: 3, max: 15, vendorId: 'srv-006', texts: ['Courier of signed contracts to Sohar', 'Courier of documents to the bank', 'Delivery of samples to a client'] },
  'cat-006': { min: 1, max: 8, payees: ['Muscat Airport Parking', 'Muscat Municipality Parking'], texts: ['Airport parking for a visitor pickup', 'Parking during the ministry visit'] },
  'cat-008': { min: 15, max: 60, payees: ['Al Angham Restaurant', 'Shangri-La Lobby Lounge'], texts: ['Coffee meeting with a prospective client', "Lunch with the vendor's project team"] },
  'cat-009': { min: 20, max: 150, payees: ['Al Waha Maintenance', 'Bright Electricals'], texts: ['Air-conditioner servicing in the meeting room', 'Replacing the office door lock', 'Repairing the site cabin lights'] },
  'cat-010': { min: 3, max: 25, vendorId: 'sup-007', texts: ['Printing tender documents', 'Business cards for the sales team', 'Photocopies of the project drawings'] },
  'cat-011': { min: 5, max: 20, payees: ['Omantel', 'Ooredoo'], texts: ['Mobile top-up for site coordination', 'Data bundle for the field laptop'] },
};

// Who claims, how often (weight), what for, and the projects they also charge.
const claimants: { id: string; department: string; weight: number; categories: string[]; projects?: string[] }[] = [
  { id: P.hamed, department: 'dep-it', weight: 5, categories: ['cat-001', 'cat-006', 'cat-005', 'cat-004'], projects: ['prj-001'] },
  { id: P.ahmed, department: 'dep-it', weight: 4, categories: ['cat-004', 'cat-011', 'cat-008', 'cat-009'], projects: ['prj-001'] },
  { id: P.maryam, department: 'dep-prj', weight: 5, categories: ['cat-002', 'cat-009', 'cat-006', 'cat-005'], projects: ['prj-002'] },
  { id: P.said, department: 'dep-prj', weight: 3, categories: ['cat-002', 'cat-009', 'cat-001'], projects: ['prj-002', 'prj-003'] },
  { id: P.fatmaHinai, department: 'dep-sales', weight: 4, categories: ['cat-002', 'cat-008', 'cat-003', 'cat-010'] },
  { id: P.noor, department: 'dep-fin', weight: 2, categories: ['cat-005', 'cat-010', 'cat-004'] },
  { id: P.fatma, department: 'dep-fin', weight: 1, categories: ['cat-005', 'cat-004'] },
  { id: P.khalid, department: 'dep-hr', weight: 1, categories: ['cat-003', 'cat-008', 'cat-006'] },
];

/** A small seeded generator, so the sample is the same on every phone. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeHistory(): ReportLine[] {
  const rand = seeded(2026);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const pool = claimants.flatMap((c) => Array<typeof c>(c.weight).fill(c));
  // Past claims take the reference numbers the sample's other claims leave free, oldest first.
  const used = new Set(initialClaims.map((c) => Number(c.reference.slice(-4))));
  const free = Array.from({ length: 188 }, (_, i) => i + 1).filter((n) => !used.has(n));
  const ages = Array.from({ length: free.length }, () => 1 + Math.floor(rand() * 185)).sort((a, b) => b - a);

  return ages.map((age, i) => {
    const who = pick(pool);
    const categoryId = pick(who.categories);
    const s = spend[categoryId];
    const onProject = !!who.projects && rand() < 0.35;
    const roll = rand();
    return {
      id: `hist-${free[i]}`,
      reference: ref('ER', free[i]),
      expenseDate: dateDaysAgo(age),
      beneficiaryId: who.id,
      vendorId: s.vendorId,
      payeeName: s.payees ? pick(s.payees) : undefined,
      categoryId,
      costLevel: onProject ? 'project' : 'department',
      costId: onProject ? pick(who.projects!) : who.department,
      status: age > 25 ? (roll < 0.95 ? 'paid' : 'approved') : age > 7 ? (roll < 0.6 ? 'paid' : 'approved') : roll < 0.6 ? 'inApproval' : 'approved',
      settlement: rand() < 0.15 ? 'salary' : 'pettyCash',
      gross: Math.round((s.min + rand() * (s.max - s.min)) * 20) / 20,
      description: pick(s.texts),
    };
  });
}

const history = makeHistory();

/** Reports always cover a period, so "All dates" is not offered. */
export const reportPresets: PeriodPreset[] = ['thisMonth', 'lastMonth', 'last3', 'last6', 'thisYear'];

/** The name of one row of a report view, such as a category or a merchant. */
export function rowName(view: ReportView, key: string, code: string) {
  if (view === 'category') return nameOf(category(key), code);
  if (view === 'employee') return nameOf(person(key), code);
  if (view === 'vendor') return key.startsWith('payee:') ? key.slice(6) : nameOf(vendor(key), code);
  return nameOf(unit(key), code);
}

/** The units the sample's IT manager sees in reports: their department and the project they run. */
export const managerScope = ['dep-it', 'prj-001'];

const counted = (c: ReimbursementView): c is ReimbursementView & { status: ReportLine['status'] } => c.status === 'inApproval' || c.status === 'approved' || c.status === 'paid';

const lineText = (l: ReportLine) => {
  const who = person(l.beneficiaryId);
  const cat = category(l.categoryId);
  const charged = unit(l.costId);
  const shop = vendor(l.vendorId);
  return [l.description, l.reference, l.payeeName, who?.nameEn, who?.nameAr, cat?.nameEn, cat?.nameAr, charged?.nameEn, charged?.nameAr, shop?.nameEn, shop?.nameAr];
};

/** The claims a report counts for this person, period and search: the sample's past claims and today's live ones. */
export function reportFor(claims: ReimbursementView[], persona: Persona, period: Period, search: string) {
  const range = periodRange(period) ?? { from: dateDaysAgo(185), to: dateDaysAgo(0) };
  const live: ReportLine[] = claims.filter(counted).map((c) => ({
    id: c.id, reference: c.reference, expenseDate: c.expenseDate, beneficiaryId: c.beneficiaryId, vendorId: c.vendorId, payeeName: c.payeeName,
    categoryId: c.categoryId, costLevel: c.costLevel, costId: c.costId, status: c.status, settlement: c.settlement, gross: c.gross, description: c.description,
  }));
  const lines = [...history, ...live]
    .filter((l) => (persona === 'finance' || managerScope.includes(l.costId)) && inRange(l.expenseDate, range) && matchesSearch(search, lineText(l), l.gross))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  return { range, lines };
}

/** Totals for each row of a report view, largest first. Department and project views count only claims charged there. */
export function groupLines(lines: ReportLine[], view: Exclude<ReportView, 'transactions'>) {
  const keyOf: Record<typeof view, (l: ReportLine) => string | undefined> = {
    category: (l) => l.categoryId,
    department: (l) => (l.costLevel === 'department' ? l.costId : undefined),
    project: (l) => (l.costLevel === 'project' ? l.costId : undefined),
    employee: (l) => l.beneficiaryId,
    vendor: (l) => l.vendorId ?? (l.payeeName ? `payee:${l.payeeName}` : undefined),
  };
  const rows = new Map<string, { key: string; amount: number; count: number }>();
  for (const l of lines) {
    const key = keyOf[view](l);
    if (!key) continue;
    const row = rows.get(key) ?? { key, amount: 0, count: 0 };
    row.amount = Math.round((row.amount + l.gross) * 1000) / 1000;
    row.count += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

/** Petty cash and salary totals for each month the range touches, oldest first. */
export function monthsOf(lines: ReportLine[], range: { from: string; to: string }) {
  const months: { month: string; pettyCash: number; salary: number }[] = [];
  for (let m = `${range.from.slice(0, 7)}-01`; m <= range.to; ) {
    const key = m.slice(0, 7);
    const inMonth = lines.filter((l) => l.expenseDate.startsWith(key));
    const sum = (s: SettlementMethod) => Math.round(inMonth.filter((l) => l.settlement === s).reduce((t, l) => t + l.gross, 0) * 1000) / 1000;
    months.push({ month: m, pettyCash: sum('pettyCash'), salary: sum('salary') });
    const d = new Date(`${m}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    m = d.toISOString().slice(0, 10);
  }
  return months;
}
