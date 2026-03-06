import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { meal, mealItem, foodItem, foodCategory } from '@burn-app/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { updateMealSchema } from '@/types/api/meal.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [mealRow] = await db
    .select({
      id: meal.id,
      name: meal.name,
      description: meal.description,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    })
    .from(meal)
    .where(eq(meal.id, id))
    .limit(1)

  if (!mealRow) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  }

  const mealItems = await db
    .select({
      id: mealItem.id,
      foodItemId: mealItem.foodItemId,
      foodName: foodItem.name,
      categoryName: foodCategory.name,
      quantity: mealItem.quantity,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
    })
    .from(mealItem)
    .innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
    .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(eq(mealItem.mealId, id))

  return NextResponse.json({
    data: {
      ...mealRow,
      mealItems: mealItems.map((mi) => ({
        id: mi.id,
        foodItemId: mi.foodItemId,
        foodName: mi.foodName,
        categoryName: mi.categoryName,
        quantity: Number(mi.quantity),
        calories: mi.calories ? Number(mi.calories) : null,
        protein: mi.protein ? Number(mi.protein) : null,
        carbs: mi.carbs ? Number(mi.carbs) : null,
        fat: mi.fat ? Number(mi.fat) : null,
      })),
    },
  })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateMealSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, mealItems } = parseResult.data

  const updateData: Record<string, string | null | undefined> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description

  if (Object.keys(updateData).length > 0) {
    const [updated] = await db
      .update(meal)
      .set(updateData)
      .where(eq(meal.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }
  }

  if (mealItems !== undefined) {
    await db.delete(mealItem).where(eq(mealItem.mealId, id))
    if (mealItems.length > 0) {
      await db.insert(mealItem).values(
        mealItems.map((item) => ({
          mealId: id,
          foodItemId: item.foodItemId,
          quantity: item.quantity.toString(),
        }))
      )
    }
  }

  const [final] = await db.select().from(meal).where(eq(meal.id, id)).limit(1)
  return NextResponse.json({ data: final })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [deleted] = await db.delete(meal).where(eq(meal.id, id)).returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
