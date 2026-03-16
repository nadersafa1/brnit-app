import dayjs from 'dayjs'

/**
 * Date-of-birth validation for the web app.
 * Uses dayjs for consistent parsing and to avoid Date timezone edge cases.
 */

/**
 * Returns true if the value is a valid date string (YYYY-MM-DD) in the past.
 * Used to validate DOB before signup/update.
 */
export function isPastDate(value: string): boolean {
  const d = dayjs(value.trim(), 'YYYY-MM-DD')
  return d.isValid() && !d.isAfter(dayjs(), 'day')
}
