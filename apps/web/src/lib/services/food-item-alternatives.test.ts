import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFoodItemAlternatives } from './food-item-alternatives'
import { resetAlternativesToleranceCache } from '@/lib/config/alternatives-tolerance'

function mockSelectChain(end: Promise<unknown>) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(end),
    then: (onFulfilled: (v: unknown) => unknown) => end.then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => end.catch(onRejected),
  }
}

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@brnit/db', () => ({
  db: {
    select: vi.fn(),
    query: {
      foodItem: {
        findFirst,
        findMany,
      },
    },
  },
}))

describe('getFoodItemAlternatives', () => {
  beforeEach(() => {
    resetAlternativesToleranceCache()
    vi.clearAllMocks()
  })

  it('returns REFERENCE_NOT_FOUND when food item does not exist', async () => {
    const { db } = await import('@brnit/db')
    vi.mocked(db.select).mockReturnValue(mockSelectChain(Promise.resolve([])) as never)
    findFirst.mockResolvedValue(null)

    const result = await getFoodItemAlternatives('non-existent-id', 150, 1, 10)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REFERENCE_NOT_FOUND')
    }
  })

  it('returns REFERENCE_INVALID when reference has null macros', async () => {
    const { db } = await import('@brnit/db')
    vi.mocked(db.select).mockReturnValue(
      mockSelectChain(Promise.resolve([{ foodCategoryId: 'cat-1' }])) as never
    )
    findFirst.mockResolvedValue({
      id: 'ref-1',
      name: 'Chicken',
      calories: null,
      protein: '20',
      carbs: '0',
      fat: '5',
      unit: '100g',
      gramsPerUnit: null,
    })

    const result = await getFoodItemAlternatives('ref-1', 150, 1, 10)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REFERENCE_INVALID')
    }
  })

  it('returns REFERENCE_INVALID when reference has no categories', async () => {
    const { db } = await import('@brnit/db')
    vi.mocked(db.select).mockReturnValue(mockSelectChain(Promise.resolve([])) as never)
    findFirst.mockResolvedValue({
      id: 'ref-1',
      name: 'Chicken',
      calories: '165',
      protein: '31',
      carbs: '0',
      fat: '3.6',
      unit: '100g',
      gramsPerUnit: null,
    })

    const result = await getFoodItemAlternatives('ref-1', 150, 1, 10)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REFERENCE_INVALID')
    }
  })

  it('returns ok with empty items when no candidates share a category', async () => {
    const { db } = await import('@brnit/db')
    vi.mocked(db.select).mockReturnValue(
      mockSelectChain(Promise.resolve([{ foodCategoryId: 'cat-1' }])) as never
    )
    findFirst.mockResolvedValue({
      id: 'ref-1',
      name: 'Chicken',
      calories: '165',
      protein: '31',
      carbs: '0',
      fat: '3.6',
      unit: '100g',
      gramsPerUnit: null,
    })
    findMany.mockResolvedValue([])

    const result = await getFoodItemAlternatives('ref-1', 150, 1, 10)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items).toEqual([])
      expect(result.totalItems).toBe(0)
    }
  })
})
