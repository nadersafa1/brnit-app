import { describe, expect, it } from 'vitest'
import { resolveMealTimeOverridesForDate, type MealTimeOverrideRow } from './diet-plan-meal-time-override'

function getTodayUTC(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('resolveMealTimeOverridesForDate', () => {
  it('prefers exact-date override over future-only override', () => {
    const today = getTodayUTC()
    const rows: MealTimeOverrideRow[] = [
      { dietPlanMealId: 'meal-1', scheduledTime: '09:00', effectiveDate: null },
      { dietPlanMealId: 'meal-1', scheduledTime: '10:30', effectiveDate: today },
    ]

    const resolved = resolveMealTimeOverridesForDate(rows, today)
    expect(resolved.get('meal-1')).toBe('10:30')
  })

  it('applies future-only overrides for today/future, but not past dates', () => {
    const today = getTodayUTC()
    const tomorrow = addDaysUTC(today, 1)
    const yesterday = addDaysUTC(today, -1)
    const rows: MealTimeOverrideRow[] = [
      { dietPlanMealId: 'meal-1', scheduledTime: '08:15', effectiveDate: null },
    ]

    const resolvedToday = resolveMealTimeOverridesForDate(rows, today)
    const resolvedTomorrow = resolveMealTimeOverridesForDate(rows, tomorrow)
    const resolvedYesterday = resolveMealTimeOverridesForDate(rows, yesterday)

    expect(resolvedToday.get('meal-1')).toBe('08:15')
    expect(resolvedTomorrow.get('meal-1')).toBe('08:15')
    expect(resolvedYesterday.get('meal-1')).toBeUndefined()
  })
})
