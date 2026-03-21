import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getMealById, updateMeal, deleteMeal } from '@/lib/services/meals'
import { updateMealSchema } from '@/types/api/meal.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const mealData = await getMealById(id)

  if (!mealData) {
    return apiErrorResponse('Meal not found', 404)
  }

  return NextResponse.json({ data: mealData })
}

const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateMealSchema.safeParse(body)

  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const result = await updateMeal(id, parseResult.data)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    return apiErrorResponse(result.error, 400)
  }

  return NextResponse.json({ data: result.data })
}

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteMeal(id)

  if (!deleted) {
    return apiErrorResponse('Meal not found', 404)
  }

  return deleteSuccessWithBody(deleted)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
