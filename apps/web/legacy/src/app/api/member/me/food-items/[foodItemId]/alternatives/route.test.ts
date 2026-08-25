import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/api-helpers/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }),
}))

vi.mock('@/lib/services/food-item-alternatives', () => ({
  getFoodItemAlternatives: vi.fn(),
}))

describe('GET /api/member/me/food-items/[foodItemId]/alternatives', () => {
  it('returns 401 when not authenticated', async () => {
    const request = new NextRequest(
      'http://localhost/api/member/me/food-items/some-id/alternatives?quantity=150'
    )
    const response = await GET(request, { params: Promise.resolve({ foodItemId: 'some-id' }) })
    expect(response.status).toBe(401)
  })
})

describe('GET alternatives with auth', () => {
  beforeEach(async () => {
    const { requireAuth } = await import('@/lib/api-helpers/require-auth')
    const { getFoodItemAlternatives } = await import('@/lib/services/food-item-alternatives')
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: 'user-1' } },
    } as never)
    vi.mocked(getFoodItemAlternatives).mockResolvedValue({
      ok: true,
      items: [],
      totalItems: 0,
    })
  })

  it('returns 400 when quantity is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/member/me/food-items/some-id/alternatives'
    )
    const response = await GET(request, { params: Promise.resolve({ foodItemId: 'some-id' }) })
    expect(response.status).toBe(400)
  })

  it('returns 404 when food item not found', async () => {
    const { getFoodItemAlternatives } = await import('@/lib/services/food-item-alternatives')
    vi.mocked(getFoodItemAlternatives).mockResolvedValue({
      ok: false,
      error: 'Food item not found',
      code: 'REFERENCE_NOT_FOUND',
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/food-items/non-existent/alternatives?quantity=150'
    )
    const response = await GET(request, {
      params: Promise.resolve({ foodItemId: 'non-existent' }),
    })
    expect(response.status).toBe(404)
  })

  it('returns 200 with pagination when alternatives found', async () => {
    const { getFoodItemAlternatives } = await import('@/lib/services/food-item-alternatives')
    vi.mocked(getFoodItemAlternatives).mockResolvedValue({
      ok: true,
      items: [
        {
          foodItemId: 'alt-1',
          name: 'Turkey',
          categories: [{ id: 'cat-1', name: 'Proteins' }],
          suggestedQuantity: 160,
          unit: '100g' as const,
          suggestedQuantityGrams: 160,
          calories: 250,
          protein: 30,
          carbs: 0,
          fat: 5,
          deltaCalories: 2,
          deltaProtein: 0.5,
          deltaCarbs: 0,
          deltaFat: 0.2,
        },
      ],
      totalItems: 1,
    })
    const request = new NextRequest(
      'http://localhost/api/member/me/food-items/ref-1/alternatives?quantity=150'
    )
    const response = await GET(request, { params: Promise.resolve({ foodItemId: 'ref-1' }) })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].name).toBe('Turkey')
    expect(json.pagination).toEqual(
      expect.objectContaining({ page: 1, perPage: 10, totalItems: 1, totalPages: 1 })
    )
  })
})
