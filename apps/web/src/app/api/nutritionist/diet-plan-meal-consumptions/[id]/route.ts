import { NextRequest, NextResponse } from 'next/server'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { deleteDietPlanMealConsumption } from '@/lib/services/diet-plan-meal-consumption'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlanMealConsumption(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Consumption not found' }, { status: 404 })
  }

  return deleteSuccessWithBody(deleted)
}

export const DELETE = withRequestLogging(deleteHandler)
