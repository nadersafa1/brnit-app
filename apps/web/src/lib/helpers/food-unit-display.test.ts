import { describe, it, expect } from 'vitest'
import {
  mealQuantityMin,
  mealQuantityStep,
  snapMealQuantityToStep,
} from '@/lib/helpers/food-unit-display'

describe('mealQuantityStep', () => {
  it('matches unified unit rules', () => {
    expect(mealQuantityStep('100g')).toBe(50)
    expect(mealQuantityStep('piece')).toBe(1)
    expect(mealQuantityStep('liters')).toBe(0.5)
    expect(mealQuantityStep('cup')).toBe(0.5)
    expect(mealQuantityStep('tbsp')).toBe(0.5)
  })
})

describe('mealQuantityMin', () => {
  it('equals step for each unit', () => {
    expect(mealQuantityMin('100g')).toBe(50)
    expect(mealQuantityMin('piece')).toBe(1)
    expect(mealQuantityMin('liters')).toBe(0.5)
  })
})

describe('snapMealQuantityToStep', () => {
  it('snaps 100g to 50g increments and clamps small values to min', () => {
    expect(snapMealQuantityToStep(150, '100g')).toBe(150)
    expect(snapMealQuantityToStep(12, '100g')).toBe(50)
    expect(snapMealQuantityToStep(175, '100g')).toBe(200)
  })

  it('snaps piece to whole numbers', () => {
    expect(snapMealQuantityToStep(2.2, 'piece')).toBe(2)
    expect(snapMealQuantityToStep(0.3, 'piece')).toBe(1)
  })

  it('snaps liters and cup/tbsp to 0.5', () => {
    expect(snapMealQuantityToStep(0.7, 'liters')).toBe(0.5)
    expect(snapMealQuantityToStep(0.9, 'liters')).toBe(1)
    expect(snapMealQuantityToStep(1.25, 'cup')).toBe(1.5)
    expect(snapMealQuantityToStep(2.3, 'tbsp')).toBe(2.5)
  })
})
