import dayjs from 'dayjs'

/**
 * Date-of-birth formatting and validation for the native app.
 * Uses dayjs for consistent parsing/formatting and to avoid Date timezone edge cases.
 */

const ISO_DATE_ONLY = 'YYYY-MM-DD'
const DISPLAY_FORMAT = 'MMM D, YYYY'

/**
 * Converts a value (Date from session, or ISO date string) to YYYY-MM-DD.
 * Returns empty string for null, undefined, or invalid dates.
 */
export function toIsoDateString(value: string | Date | null | undefined): string {
  if (value == null) return ''
  const d = value instanceof Date ? dayjs(value) : dayjs(String(value).trim(), ISO_DATE_ONLY)
  if (!d.isValid()) return ''
  return d.format(ISO_DATE_ONLY)
}

/**
 * Formats a Date as YYYY-MM-DD for API payloads.
 */
export function formatDobForApi(date: Date): string {
  return dayjs(date).format(ISO_DATE_ONLY)
}

/**
 * Formats YYYY-MM-DD or Date for display (e.g. "Jan 15, 1990"). Always returns a string.
 * Handles session/API returning Date so callers never render an object as a React child.
 */
export function formatDobForDisplay(isoOrDate: string | Date | null | undefined): string {
  if (isoOrDate == null) return ''
  const d =
    isoOrDate instanceof Date
      ? dayjs(isoOrDate)
      : dayjs(String(isoOrDate).trim(), ISO_DATE_ONLY)
  if (!d.isValid()) return ''
  return d.format(DISPLAY_FORMAT)
}

/**
 * Returns true if the value is a valid date string (YYYY-MM-DD) in the past.
 * Used by Zod schemas for DOB validation.
 */
export function isValidPastDob(value: string): boolean {
  const trimmed = String(value).trim()
  if (!trimmed) return false
  const d = dayjs(trimmed, ISO_DATE_ONLY)
  return d.isValid() && !d.isAfter(dayjs(), 'day')
}

/**
 * Parses YYYY-MM-DD to a Date for the native DateTimePicker. Returns today if invalid.
 */
export function parseIsoToDate(iso: string): Date {
  const d = dayjs(iso, ISO_DATE_ONLY)
  return d.isValid() ? d.toDate() : dayjs().toDate()
}

/**
 * Converts a validated YYYY-MM-DD string to a Date for API payloads (local calendar date as JS Date).
 * Call only after format validation (e.g. isValidPastDob).
 */
export function dobIsoStringToDate(iso: string): Date {
  return dayjs(iso.trim(), ISO_DATE_ONLY).toDate()
}
