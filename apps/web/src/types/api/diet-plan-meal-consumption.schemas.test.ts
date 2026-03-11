import { describe, it, expect } from 'vitest'
import { createDietPlanMealConsumptionSchema } from './diet-plan-meal-consumption.schemas'

const validUuid = 'a1b2c3d4-e5f6-4789-a012-000000000001'

describe('createDietPlanMealConsumptionSchema', () => {
  it('accepts body without consumedItems', () => {
    const result = createDietPlanMealConsumptionSchema.safeParse({
      dietPlanAssignmentId: validUuid,
      dietPlanMealId: 'a1b2c3d4-e5f6-4789-a012-000000000002',
      consumedAt: new Date('2025-03-10T12:00:00.000Z'),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consumedItems).toBeUndefined()
    }
  })

  it('accepts body with valid consumedItems', () => {
    const result = createDietPlanMealConsumptionSchema.safeParse({
      dietPlanAssignmentId: validUuid,
      dietPlanMealId: 'a1b2c3d4-e5f6-4789-a012-000000000002',
      consumedAt: new Date('2025-03-10T12:00:00.000Z'),
      consumedItems: [
        { foodItemId: 'a1b2c3d4-e5f6-4789-a012-000000000003', quantity: 150 },
        { foodItemId: 'a1b2c3d4-e5f6-4789-a012-000000000004', quantity: 200 },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consumedItems).toHaveLength(2)
      expect(result.data.consumedItems![0]).toEqual({
        foodItemId: 'a1b2c3d4-e5f6-4789-a012-000000000003',
        quantity: 150,
      })
    }
  })

  it('rejects consumedItems with invalid foodItemId', () => {
    const result = createDietPlanMealConsumptionSchema.safeParse({
      dietPlanAssignmentId: validUuid,
      dietPlanMealId: 'a1b2c3d4-e5f6-4789-a012-000000000002',
      consumedAt: '2025-03-10T12:00:00.000Z',
      consumedItems: [{ foodItemId: 'not-a-uuid', quantity: 150 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects consumedItems with non-positive quantity', () => {
    const result = createDietPlanMealConsumptionSchema.safeParse({
      dietPlanAssignmentId: validUuid,
      dietPlanMealId: 'a1b2c3d4-e5f6-4789-a012-000000000002',
      consumedAt: '2025-03-10T12:00:00.000Z',
      consumedItems: [
        { foodItemId: 'a1b2c3d4-e5f6-4789-a012-000000000003', quantity: 0 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects consumedItems with more than 50 entries', () => {
    const result = createDietPlanMealConsumptionSchema.safeParse({
      dietPlanAssignmentId: validUuid,
      dietPlanMealId: 'a1b2c3d4-e5f6-4789-a012-000000000002',
      consumedAt: '2025-03-10T12:00:00.000Z',
      consumedItems: Array.from({ length: 51 }, () => ({
        foodItemId: 'a1b2c3d4-e5f6-4789-a012-000000000003',
        quantity: 100,
      })),
    })
    expect(result.success).toBe(false)
  })
})
