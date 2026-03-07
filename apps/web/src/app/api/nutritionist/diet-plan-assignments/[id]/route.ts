import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import {
  getDietPlanAssignmentById,
  updateDietPlanAssignment,
  deleteDietPlanAssignment,
} from '@/lib/services/diet-plan-assignments'
import { updateDietPlanAssignmentSchema } from '@/types/api/diet-plan-assignment.schemas'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const assignment = await getDietPlanAssignmentById(id)

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  return NextResponse.json({ data: assignment })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateDietPlanAssignmentSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await updateDietPlanAssignment(id, parseResult.data)

  if (!result.ok) {
    if (result.code === 'OVERLAP') {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ data: result.data })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteDietPlanAssignment(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
