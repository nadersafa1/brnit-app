import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { dietPlan, dietPlanMeal, meal } from '@burn-app/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { updateDietPlanSchema } from '@/types/api/diet-plan.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [plan] = await db
    .select({
      id: dietPlan.id,
      name: dietPlan.name,
      description: dietPlan.description,
      startDate: dietPlan.startDate,
      endDate: dietPlan.endDate,
      createdAt: dietPlan.createdAt,
      updatedAt: dietPlan.updatedAt,
    })
    .from(dietPlan)
    .where(eq(dietPlan.id, id))
    .limit(1)

  if (!plan) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  const planMeals = await db
    .select({
      id: dietPlanMeal.id,
      mealId: dietPlanMeal.mealId,
      mealName: meal.name,
      dayNumber: dietPlanMeal.dayNumber,
      mealType: dietPlanMeal.mealType,
    })
    .from(dietPlanMeal)
    .innerJoin(meal, eq(dietPlanMeal.mealId, meal.id))
    .where(eq(dietPlanMeal.dietPlanId, id))
    .orderBy(asc(dietPlanMeal.dayNumber), asc(dietPlanMeal.mealType))

  return NextResponse.json({
    data: {
      ...plan,
      dietPlanMeals: planMeals.map((pm) => ({
        id: pm.id,
        mealId: pm.mealId,
        mealName: pm.mealName,
        dayNumber: pm.dayNumber,
        mealType: pm.mealType,
      })),
    },
  })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateDietPlanSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, startDate, endDate, dietPlanMeals } = parseResult.data

  const updateData: Record<string, string | null | undefined> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (startDate !== undefined) updateData.startDate = startDate
  if (endDate !== undefined) updateData.endDate = endDate

  if (Object.keys(updateData).length > 0) {
    const [updated] = await db
      .update(dietPlan)
      .set(updateData)
      .where(eq(dietPlan.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
    }
  }

  if (dietPlanMeals !== undefined) {
    await db.delete(dietPlanMeal).where(eq(dietPlanMeal.dietPlanId, id))
    if (dietPlanMeals.length > 0) {
      await db.insert(dietPlanMeal).values(
        dietPlanMeals.map((item) => ({
          dietPlanId: id,
          mealId: item.mealId,
          dayNumber: item.dayNumber,
          mealType: item.mealType,
        }))
      )
    }
  }

  const [final] = await db.select().from(dietPlan).where(eq(dietPlan.id, id)).limit(1)
  return NextResponse.json({ data: final })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params

  const [deleted] = await db.delete(dietPlan).where(eq(dietPlan.id, id)).returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
