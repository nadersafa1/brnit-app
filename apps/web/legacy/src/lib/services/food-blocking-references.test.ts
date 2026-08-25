import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@brnit/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

function selectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

describe('foodItemHasBlockingReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when no table references the food item', async () => {
    const { db } = await import('@brnit/db')
    const { foodItemHasBlockingReferences } = await import('./food')

    vi.mocked(db.select)
      .mockImplementationOnce(() => selectChain([]) as never)
      .mockImplementationOnce(() => selectChain([]) as never)
      .mockImplementationOnce(() => selectChain([]) as never)

    await expect(foodItemHasBlockingReferences('food-1')).resolves.toBe(false)
    expect(db.select).toHaveBeenCalledTimes(3)
  })

  it('returns true when meal_item references the food item', async () => {
    const { db } = await import('@brnit/db')
    const { foodItemHasBlockingReferences } = await import('./food')

    vi.mocked(db.select)
      .mockImplementationOnce(() => selectChain([{ id: 'mi-1' }]) as never)
      .mockImplementationOnce(() => selectChain([]) as never)
      .mockImplementationOnce(() => selectChain([]) as never)

    await expect(foodItemHasBlockingReferences('food-1')).resolves.toBe(true)
  })
})
