import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { foodCategory } from '@burn-app/db/schema'
import { asc, ilike } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  createFoodCategorySchema,
  foodCategoriesQuerySchema,
} from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = foodCategoriesQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { q } = parseResult.data

  const categories = await db
    .select()
    .from(foodCategory)
    .where(q ? ilike(foodCategory.name, `%${q}%`) : undefined)
    .orderBy(asc(foodCategory.name))

  return NextResponse.json({ data: categories })
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createFoodCategorySchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name } = parseResult.data

  const [newCategory] = await db
    .insert(foodCategory)
    .values({ name })
    .returning()

  return NextResponse.json({ data: newCategory }, { status: 201 })
}
