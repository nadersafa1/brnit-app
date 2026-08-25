import { describe, expect, it } from 'vitest'
import {
  createDietPlanAssignmentNutritionistSchema,
  updateDietPlanAssignmentSchema,
} from './diet-plan-assignment.schemas'

describe('diet-plan-assignment schemas', () => {
  it('accepts create payload with optional meal time overrides', () => {
    const parsed = createDietPlanAssignmentNutritionistSchema.safeParse({
      memberId: 'member-1',
      dietPlanId: '550e8400-e29b-41d4-a716-446655440000',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      mealTimeOverrides: [
        { dietPlanMealId: '550e8400-e29b-41d4-a716-446655440001', scheduledTime: '08:00' },
        { dietPlanMealId: '550e8400-e29b-41d4-a716-446655440002', scheduledTime: null },
      ],
    })

    expect(parsed.success).toBe(true)
  })

  it('allows update with mealTimeOverrides only (without dates)', () => {
    const parsed = updateDietPlanAssignmentSchema.safeParse({
      mealTimeOverrides: [
        { dietPlanMealId: '550e8400-e29b-41d4-a716-446655440001', scheduledTime: '12:30' },
      ],
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects duplicate dietPlanMealId entries in mealTimeOverrides', () => {
    const parsed = updateDietPlanAssignmentSchema.safeParse({
      mealTimeOverrides: [
        { dietPlanMealId: '550e8400-e29b-41d4-a716-446655440001', scheduledTime: '08:00' },
        { dietPlanMealId: '550e8400-e29b-41d4-a716-446655440001', scheduledTime: '09:00' },
      ],
    })

    expect(parsed.success).toBe(false)
  })
})
