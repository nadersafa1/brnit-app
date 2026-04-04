import { describe, expect, it } from 'vitest'
import { resolveOverridesForDate, type OverrideRow } from '@/lib/services/diet-plan-meal-item-override'

function row(partial: Partial<OverrideRow>): OverrideRow {
  return {
    dietPlanMealId: 'meal-1',
    mealItemId: 'item-1',
    foodItemId: 'food-default',
    foodName: 'Default',
    quantity: '1',
    effectiveDates: ['2026-01-01'],
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...partial,
  }
}

describe('resolveOverridesForDate', () => {
  it('supports different food overrides on different days for the same slot', () => {
    const rows: OverrideRow[] = [
      row({
        effectiveDates: ['2026-04-08'],
        foodItemId: 'food-a',
      }),
      row({
        effectiveDates: ['2026-04-09'],
        foodItemId: 'food-b',
      }),
    ]

    const resolvedDayOne = resolveOverridesForDate(rows, '2026-04-08')
    const resolvedDayTwo = resolveOverridesForDate(rows, '2026-04-09')

    expect(resolvedDayOne.get('meal-1:item-1')?.foodItemId).toBe('food-a')
    expect(resolvedDayTwo.get('meal-1:item-1')?.foodItemId).toBe('food-b')
  })

  it('selects newest row when multiple rows include the date', () => {
    const rows: OverrideRow[] = [
      row({
        effectiveDates: ['2026-04-01', '2026-04-08'],
        foodItemId: 'food-old',
        updatedAt: new Date('2026-04-01T10:00:00.000Z'),
      }),
      row({
        effectiveDates: ['2026-04-08'],
        foodItemId: 'food-new',
        updatedAt: new Date('2026-04-01T11:00:00.000Z'),
      }),
    ]

    const resolved = resolveOverridesForDate(rows, '2026-04-08')
    expect(resolved.get('meal-1:item-1')?.foodItemId).toBe('food-new')
  })

  it('returns matching row when date exists in effectiveDates', () => {
    const rows: OverrideRow[] = [
      row({
        effectiveDates: ['2026-04-01', '2026-04-08'],
        foodItemId: 'food-match',
      }),
    ]

    const resolved = resolveOverridesForDate(rows, '2026-04-08')
    expect(resolved.get('meal-1:item-1')?.foodItemId).toBe('food-match')
  })

  it('returns no override when no configured window matches the resolution date', () => {
    const rows: OverrideRow[] = [
      row({
        effectiveDates: ['2026-04-10'],
        foodItemId: 'food-rest',
      }),
      row({
        effectiveDates: ['2026-04-12'],
        foodItemId: 'food-day',
      }),
    ]

    const resolved = resolveOverridesForDate(rows, '2026-04-08')

    expect(resolved.get('meal-1:item-1')).toBeUndefined()
  })

  it('uses latest updatedAt when duplicate slot rows exist', () => {
    const rows: OverrideRow[] = [
      row({
        effectiveDates: ['2026-04-05', '2026-04-06'],
        foodItemId: 'food-old',
        updatedAt: new Date('2026-04-01T10:00:00.000Z'),
      }),
      row({
        effectiveDates: ['2026-04-05', '2026-04-06'],
        foodItemId: 'food-new',
        updatedAt: new Date('2026-04-01T11:00:00.000Z'),
      }),
    ]

    const resolved = resolveOverridesForDate(rows, '2026-04-06')
    expect(resolved.get('meal-1:item-1')?.foodItemId).toBe('food-new')
  })
})
