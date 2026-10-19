// Sample dates are counted back from today, in Oman time, so the sample always looks recent.
const OMAN_OFFSET_HOURS = 4;

/** Today as yyyy-mm-dd in Oman. */
export function omanToday(): string {
  return new Date(Date.now() + OMAN_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}

/** A date some days ago, as yyyy-mm-dd. Negative days are in the future. */
export function dateDaysAgo(days: number): string {
  const d = new Date(`${omanToday()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** A moment some days ago at an Oman time of day, as an ISO UTC string. */
export function daysAgo(days: number, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${dateDaysAgo(days)}T00:00:00Z`);
  d.setUTCHours(h - OMAN_OFFSET_HOURS, m);
  return d.toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** The first day of the month some months back, as yyyy-mm-01. */
export function monthStart(monthsBack: number): string {
  const d = new Date(`${omanToday().slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}
