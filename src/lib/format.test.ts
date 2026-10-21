import { describe, expect, it } from '@jest/globals';

import type { GroupReport, ReportRow } from '@/api/types';

import { payeeOf, percent } from './format';
import { reportTable, rowKeyOf } from './report-tables';

describe('merchants', () => {
  it("links a typed name to the merchant's record, whatever the case", () => {
    expect(payeeOf('  oman TAXI ')).toEqual({ vendorId: 'ven-003' });
    expect(payeeOf('Corner Shop')).toEqual({ payeeName: 'Corner Shop' });
    expect(payeeOf('   ')).toEqual({});
  });

  it('keeps a merchant with no record under the name typed', () => {
    expect(rowKeyOf('vendor', { payeeName: 'Corner Shop' } as ReportRow)).toBe('payee:Corner Shop');
    expect(rowKeyOf('vendor', { vendorId: 'ven-003', payeeName: 'x' } as ReportRow)).toBe('ven-003');
  });
});

describe('report tables', () => {
  it('shows shares to one decimal, as the web does', () => {
    expect(percent(48.24, 'en')).toBe('48.2%');
    expect(percent(100, 'en')).toBe('100%');
  });

  it('lays out the category export as the web does, with a totals row', () => {
    const data = {
      rows: [{ categoryId: 'cat-001', claims: 2, claimed: 10.5, share: 48.24, paid: 10.5, pending: 0 }],
      totals: { claims: 2, claimed: 10.5, paid: 10.5, pending: 0 },
    } as unknown as GroupReport;
    const table = reportTable('category', data, (key) => key, 'en', ['Period']);
    expect(table.columns.map((c) => c.label)).toEqual([
      'web:report.column.category', 'web:report.column.claims', 'web:report.column.claimed', 'web:report.column.share', 'web:report.column.paid', 'web:report.column.pending',
    ]);
    expect(table.rows).toEqual([['Local Travel', 2, '10.500', '48.2%', '10.500', '0.000']]);
    expect(table.totals).toEqual(['web:report.totalRow', 2, '10.500', '100%', '10.500', '0.000']);
  });
});
