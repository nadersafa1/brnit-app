import dayjs from 'dayjs'
import { env } from '@brnit/env/native'

const DEFAULT_MAX_PAST_DAYS = 2
const MAX_PAST_DAYS_UPPER_BOUND = 365

function parseMaxPastDays(raw: string | undefined): number {
  if (!raw) return DEFAULT_MAX_PAST_DAYS
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_MAX_PAST_DAYS
  return Math.min(parsed, MAX_PAST_DAYS_UPPER_BOUND)
}

export function getMaxConsumptionPastDays(): number {
  return parseMaxPastDays(env.EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS)
}

export function isWithinConsumptionDateWindow(date: Date, maxPastDays = getMaxConsumptionPastDays()): boolean {
  const day = dayjs(date).startOf('day')
  const today = dayjs().startOf('day')
  const minDate = today.subtract(maxPastDays, 'day')
  return !day.isAfter(today, 'day') && !day.isBefore(minDate, 'day')
}

export class ConsumptionDateOutOfAllowedWindowError extends Error {
  constructor() {
    super('Consumption date must be within the allowed range.')
    this.name = 'ConsumptionDateOutOfAllowedWindowError'
  }
}

export type ConsumptionMarkEligibility = {
  allowed: boolean
  reason?: string
}

function parseIsoDateOnly(value: string): dayjs.Dayjs | null {
  const d = dayjs(value, 'YYYY-MM-DD', true)
  return d.isValid() ? d.startOf('day') : null
}

/**
 * UI helper for whether the member can mark/unmark consumption for the given day.
 *
 * Important assumptions:
 * - Uses member local timezone for "today" (date-only comparisons).
 * - If assignment bounds are provided, "markable" includes (endDate + maxPastDays) as "grace".
 */
export function getConsumptionMarkEligibility(
  consumedDate: string,
  opts?: {
    maxPastDays?: number
    assignmentStartDate?: string
    assignmentEndDate?: string
  }
): ConsumptionMarkEligibility {
  const maxPastDays = opts?.maxPastDays ?? getMaxConsumptionPastDays()
  const consumedDay = parseIsoDateOnly(consumedDate)
  if (!consumedDay) return { allowed: false, reason: 'Invalid date' }

  const today = dayjs().startOf('day')
  const minAllowedDate = today.subtract(maxPastDays, 'day')

  // 1) No-future / no-too-old guard.
  if (consumedDay.isAfter(today, 'day')) return { allowed: false, reason: 'Cannot mark future dates' }
  if (consumedDay.isBefore(minAllowedDate, 'day')) return { allowed: false, reason: `Only last ${maxPastDays} days` }

  // 2) Assignment window guard (endDate + graceDays).
  if (opts?.assignmentStartDate && opts?.assignmentEndDate) {
    const startDay = parseIsoDateOnly(opts.assignmentStartDate)
    const endDay = parseIsoDateOnly(opts.assignmentEndDate)

    if (startDay && endDay) {
      const endWithGrace = endDay.add(maxPastDays, 'day')
      const withinAssignment =
        !consumedDay.isBefore(startDay, 'day') && !consumedDay.isAfter(endWithGrace, 'day')

      if (!withinAssignment) return { allowed: false, reason: 'Date is outside your plan period' }
    }
  }

  return { allowed: true }
}
