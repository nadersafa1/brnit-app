import { describe, expect, it } from 'vitest'
import { addDaysUTC, getTodayUtcDateString } from '@/lib/helpers/date-utc'
import { resolveMealTimeOverridesForDate, type MealTimeOverrideRow } from './diet-plan-meal-time-override'

describe('resolveMealTimeOverridesForDate', () => {
  it('prefers exact-date override over future-only override', () => {
    const today = getTodayUtcDateString()
    const rows: MealTimeOverrideRow[] = [
      { dietPlanMealId: 'meal-1', scheduledTime: '09:00', effectiveDate: null },
      { dietPlanMealId: 'meal-1', scheduledTime: '10:30', effectiveDate: today },
    ]

    const resolved = resolveMealTimeOverridesForDate(rows, today)
    expect(resolved.get('meal-1')).toBe('10:30')
  })

  it('applies future-only overrides for today/future, but not past dates', () => {
    const today = getTodayUtcDateString()
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
