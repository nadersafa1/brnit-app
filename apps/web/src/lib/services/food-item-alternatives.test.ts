import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFoodItemAlternatives } from './food-item-alternatives'
import { resetAlternativesToleranceCache } from '@/lib/config/alternatives-tolerance'

function mockChain(end: Promise<unknown>) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(end),
    then: (onFulfilled: (v: unknown) => unknown) => end.then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => end.catch(onRejected),
  }
}

vi.mock('@burn-app/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

describe('getFoodItemAlternatives', () => {
  beforeEach(() => {
    resetAlternativesToleranceCache()
    vi.clearAllMocks()
  })

  it('returns REFERENCE_NOT_FOUND when food item does not exist', async () => {
    const { db } = await import('@burn-app/db')
    vi.mocked(db.select).mockReturnValue(mockChain(Promise.resolve([])) as never)

    const result = await getFoodItemAlternatives('non-existent-id', 150, 1, 10)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REFERENCE_NOT_FOUND')
    }
  })

  it('returns REFERENCE_INVALID when reference has null macros', async () => {
    const { db } = await import('@burn-app/db')
    vi.mocked(db.select).mockReturnValue(
      mockChain(
        Promise.resolve([
          {
            id: 'ref-1',
            name: 'Chicken',
            categoryId: 'cat-1',
            calories: null,
            protein: '20',
            carbs: '0',
            fat: '5',
          },
        ])
      ) as never
    )

    const result = await getFoodItemAlternatives('ref-1', 150, 1, 10)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REFERENCE_INVALID')
    }
  })

  it('returns ok with empty items when no candidates in same category', async () => {
    const { db } = await import('@burn-app/db')
    let callCount = 0
    vi.mocked(db.select).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain(
          Promise.resolve([
            {
              id: 'ref-1',
              name: 'Chicken',
              categoryId: 'cat-1',
              calories: '165',
              protein: '31',
              carbs: '0',
              fat: '3.6',
            },
          ])
        ) as never
      }
      return mockChain(Promise.resolve([])) as never
    })

    const result = await getFoodItemAlternatives('ref-1', 150, 1, 10)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items).toEqual([])
      expect(result.totalItems).toBe(0)
    }
  })
})
