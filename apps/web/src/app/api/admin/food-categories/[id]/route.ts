import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { foodCategory } from '@burn-app/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { updateFoodCategorySchema } from '@/types/api/food.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [category] = await db
    .select()
    .from(foodCategory)
    .where(eq(foodCategory.id, id))
    .limit(1)

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ data: category })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateFoodCategorySchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name } = parseResult.data

  const [updated] = await db
    .update(foodCategory)
    .set({ name })
    .where(eq(foodCategory.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ data: updated })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [deleted] = await db
    .delete(foodCategory)
    .where(eq(foodCategory.id, id))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
