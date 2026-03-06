import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { foodItem, foodCategory } from '@burn-app/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { updateFoodItemSchema } from '@/types/api/food.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [item] = await db
    .select({
      id: foodItem.id,
      name: foodItem.name,
      fdcId: foodItem.fdcId,
      categoryId: foodItem.categoryId,
      categoryName: foodCategory.name,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      servingSize: foodItem.servingSize,
      createdAt: foodItem.createdAt,
      updatedAt: foodItem.updatedAt,
    })
    .from(foodItem)
    .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(eq(foodItem.id, id))
    .limit(1)

  if (!item) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: item })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateFoodItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, categoryId, fdcId, calories, protein, carbs, fat, servingSize } = parseResult.data

  const updateData: Record<string, string | number | null | undefined> = {}
  if (name !== undefined) updateData.name = name
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (fdcId !== undefined) updateData.fdcId = fdcId
  if (calories !== undefined) updateData.calories = calories?.toString() ?? null
  if (protein !== undefined) updateData.protein = protein?.toString() ?? null
  if (carbs !== undefined) updateData.carbs = carbs?.toString() ?? null
  if (fat !== undefined) updateData.fat = fat?.toString() ?? null
  if (servingSize !== undefined) updateData.servingSize = servingSize?.toString() ?? null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(foodItem)
    .set(updateData)
    .where(eq(foodItem.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: updated })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [deleted] = await db
    .delete(foodItem)
    .where(eq(foodItem.id, id))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
