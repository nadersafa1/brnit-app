import { NextRequest, NextResponse } from 'next/server'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { deleteDietPlanMealConsumption } from '@/lib/services/diet-plan-meal-consumption'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlanMealConsumption(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Consumption not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
