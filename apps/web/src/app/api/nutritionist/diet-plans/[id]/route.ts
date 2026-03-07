import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getDietPlanById, updateDietPlan, deleteDietPlan } from '@/lib/services/diet-plans'
import { updateDietPlanSchema } from '@/types/api/diet-plan.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const planData = await getDietPlanById(id)

  if (!planData) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  return NextResponse.json({ data: planData })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
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

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlan(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
