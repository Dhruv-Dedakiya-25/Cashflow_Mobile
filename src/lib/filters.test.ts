import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { matchesSearch, periodRange, reportRange } from './filters';

describe('search', () => {
  it('finds an amount by how it begins', () => {
    expect(matchesSearch('12.6', [], 12.6)).toBe(true);
    expect(matchesSearch('12.6', [], 12.65)).toBe(true);
    expect(matchesSearch('12.6', [], 412.65)).toBe(false);
    expect(matchesSearch('1,250', [], 1250.5)).toBe(true);
  });

  it('needs every word, in any order or case', () => {
    expect(matchesSearch('MUSCAT taxi', ['Taxi to ministry', 'Muscat'])).toBe(true);
    expect(matchesSearch('taxi sohar', ['Taxi to ministry', 'Muscat'])).toBe(false);
    expect(matchesSearch('  ', ['anything'])).toBe(true);
  });
});

describe('periods, in Oman time', () => {
  const at = (iso: string) => jest.useFakeTimers({ now: new Date(iso) });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts calendar months back from today', () => {
    at('2026-10-20T08:00:00Z');
    expect(periodRange({ preset: 'thisMonth' })).toEqual({ from: '2026-10-01', to: '2026-10-20' });
    expect(periodRange({ preset: 'last6' })).toEqual({ from: '2026-05-01', to: '2026-10-20' });
    expect(periodRange({ preset: 'thisYear' })).toEqual({ from: '2026-01-01', to: '2026-10-20' });
  });

  it('takes last month across the new year', () => {
    at('2027-01-05T08:00:00Z');
    expect(periodRange({ preset: 'lastMonth' })).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('is already the next day in Oman from 20:00 UTC', () => {
    at('2026-10-31T21:00:00Z');
    expect(periodRange({ preset: 'thisMonth' })).toEqual({ from: '2026-11-01', to: '2026-11-01' });
  });

  it('gives a report the last six months when every date is asked for', () => {
    at('2026-10-20T08:00:00Z');
    expect(periodRange({ preset: 'all' })).toBeUndefined();
    expect(reportRange({ preset: 'all' })).toEqual({ from: '2026-05-01', to: '2026-10-20' });
  });
});
