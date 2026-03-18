import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getDietPlanById, updateDietPlan, deleteDietPlan } from '@/lib/services/diet-plans'
import { updateDietPlanSchema } from '@/types/api/diet-plan.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const planData = await getDietPlanById(id)

  if (!planData) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  return NextResponse.json({ data: planData })
}

const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateDietPlanSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await updateDietPlan(id, parseResult.data)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const planData = await getDietPlanById(id)
  return NextResponse.json({ data: planData })
}

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlan(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  return deleteSuccessWithBody(deleted)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
