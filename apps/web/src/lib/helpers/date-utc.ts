/**
 * UTC calendar dates as YYYY-MM-DD (no time-of-day).
 * Used across diet-plan services so "today" and range math stay consistent.
 */

export function toDateStringUTC(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStringUTC(d)
}

/** Today's date in UTC as YYYY-MM-DD. */
export function getTodayUtcDateString(): string {
  return toDateStringUTC(new Date())
}
