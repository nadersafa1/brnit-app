const DEFAULT_MAX_CONSUMPTION_PAST_DAYS = 2
const MAX_CONSUMPTION_PAST_DAYS_UPPER_BOUND = 365

let cachedMaxPastDays: number | null = null

export function getMaxConsumptionPastDays(): number {
  if (cachedMaxPastDays !== null) return cachedMaxPastDays

  const raw = process.env.MAX_CONSUMPTION_PAST_DAYS
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_CONSUMPTION_PAST_DAYS
  const value =
    Number.isNaN(parsed) || parsed < 0 ? DEFAULT_MAX_CONSUMPTION_PAST_DAYS : parsed

  cachedMaxPastDays = Math.max(0, Math.min(MAX_CONSUMPTION_PAST_DAYS_UPPER_BOUND, value))
  return cachedMaxPastDays
}

export function resetConsumptionWindowConfigCache(): void {
  cachedMaxPastDays = null
}
