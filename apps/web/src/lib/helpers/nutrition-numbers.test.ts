import { describe, expect, it } from 'vitest'
import {
  roundNutritionMacro,
  roundNutritionMacroNullable,
  roundNutritionMacroRequired,
} from '@/lib/helpers/nutrition-numbers'

describe('roundNutritionMacro', () => {
  it('rounds to two decimal places', () => {
    expect(roundNutritionMacro(12.3456)).toBe(12.35)
    expect(roundNutritionMacro(12.344)).toBe(12.34)
  })
})

describe('roundNutritionMacroNullable', () => {
  it('returns rounded number for valid input', () => {
    expect(roundNutritionMacroNullable('9.876')).toBe(9.88)
    expect(roundNutritionMacroNullable(4.321)).toBe(4.32)
  })

  it('returns null for empty or invalid input', () => {
    expect(roundNutritionMacroNullable(null)).toBeNull()
    expect(roundNutritionMacroNullable(undefined)).toBeNull()
    expect(roundNutritionMacroNullable('')).toBeNull()
    expect(roundNutritionMacroNullable('not-a-number')).toBeNull()
  })
})

describe('roundNutritionMacroRequired', () => {
  it('returns rounded number for valid input', () => {
    expect(roundNutritionMacroRequired('101.239')).toBe(101.24)
    expect(roundNutritionMacroRequired(101.231)).toBe(101.23)
  })

  it('returns zero for empty or invalid input', () => {
    expect(roundNutritionMacroRequired(null)).toBe(0)
    expect(roundNutritionMacroRequired(undefined)).toBe(0)
    expect(roundNutritionMacroRequired('')).toBe(0)
    expect(roundNutritionMacroRequired('not-a-number')).toBe(0)
  })
})
