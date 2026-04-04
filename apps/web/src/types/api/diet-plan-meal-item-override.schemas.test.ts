import { describe, expect, it } from 'vitest'
import { setDietPlanMealItemOverrideBodySchema } from './diet-plan-meal-item-override.schemas'

const foodItemId = 'f15f7a96-bb52-46ba-8e09-7f1b9655e87a'
const overrideId = '0a6f5ca2-4b26-4f76-9a8d-fbc6f02f5f44'

describe('setDietPlanMealItemOverrideBodySchema', () => {
  it('accepts explicit single_day scope payload', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      foodItemId,
      quantity: 1.5,
      scope: 'single_day',
      startDate: '2026-04-10',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects period scope payloads', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      foodItemId,
      quantity: 1,
      scope: 'period',
      startDate: '2026-04-15',
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects endDate for single_day scope', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      foodItemId,
      quantity: 1,
      scope: 'single_day',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts explicit rest_of_plan scope payload', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      foodItemId,
      quantity: 2,
      scope: 'rest_of_plan',
      startDate: '2026-04-12',
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts optional overrideId for targeted updates', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      overrideId,
      foodItemId,
      quantity: 2,
      scope: 'single_day',
      startDate: '2026-04-12',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects legacy payload fields', () => {
    const parsed = setDietPlanMealItemOverrideBodySchema.safeParse({
      foodItemId,
      quantity: 2,
      fromDate: '2026-04-12',
    })

    expect(parsed.success).toBe(false)
  })
})
