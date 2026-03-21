import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { getDietPlanById, updateDietPlan, deleteDietPlan } from '@/lib/services/diet-plans'
import { updateDietPlanSchema } from '@/types/api/diet-plan.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

/** Returns a single diet plan by id (admin). */
const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const planData = await getDietPlanById(id)

  if (!planData) {
    return apiErrorResponse('Diet plan not found', 404)
  }

  return NextResponse.json({ data: planData })
}

/** Updates a diet plan; returns full plan (with slots) for cache/UI. */
const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateDietPlanSchema.safeParse(body)

  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const result = await updateDietPlan(id, parseResult.data)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    return apiErrorResponse(result.error, 400)
  }

  const planData = await getDietPlanById(id)
  return NextResponse.json({ data: planData })
}

/** Deletes a diet plan; returns deleted entity in response body. */
const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlan(id)

  if (!deleted) {
    return apiErrorResponse('Diet plan not found', 404)
  }

  return deleteSuccessWithBody(deleted)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
