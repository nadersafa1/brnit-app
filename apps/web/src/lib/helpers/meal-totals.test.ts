import { describe, it, expect } from 'vitest'
import {
  computeMealTotalsFromLineItems,
  mealTotalsLinesFromDbRows,
} from '@burn-app/db/meal-totals'

describe('computeMealTotalsFromLineItems', () => {
  it('scales 100g rows by quantity/100 and rounds totals to 2 decimals', () => {
    const totals = computeMealTotalsFromLineItems([
      { quantity: 200, calories: 100, protein: 10, carbs: 20, fat: 5, unit: '100g' },
    ])
    expect(totals).toEqual({
      calories: 200,
      protein: 20,
      carbs: 40,
      fat: 10,
    })
  })

  it('uses factor = quantity for non-100g units', () => {
    const totals = computeMealTotalsFromLineItems([
      { quantity: 2, calories: 50, protein: 5, carbs: 8, fat: 2, unit: 'piece' },
    ])
    expect(totals).toEqual({
      calories: 100,
      protein: 10,
      carbs: 16,
      fat: 4,
    })
  })
})

describe('mealTotalsLinesFromDbRows', () => {
  it('coerces string numerics and null macros to numbers for summation', () => {
    const lines = mealTotalsLinesFromDbRows([
      {
        quantity: '100',
        calories: '10',
        protein: null,
        carbs: '2',
        fat: '1',
        unit: '100g',
      },
    ])
    expect(computeMealTotalsFromLineItems(lines)).toEqual({
      calories: 10,
      protein: 0,
      carbs: 2,
      fat: 1,
    })
  })
})
