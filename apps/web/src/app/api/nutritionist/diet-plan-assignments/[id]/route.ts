import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import {
  getDietPlanAssignmentById,
  updateDietPlanAssignment,
  deleteDietPlanAssignment,
  assignmentMemberBelongsToOrg,
} from '@/lib/services/diet-plan-assignments'
import { updateDietPlanAssignmentSchema } from '@/types/api/diet-plan-assignment.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

async function checkAssignmentOrgAccess(
  assignmentId: string,
  activeOrgId: string | null
): Promise<NextResponse | null> {
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'Active organization required' },
      { status: 403 }
    )
  }
  const belongs = await assignmentMemberBelongsToOrg(assignmentId, activeOrgId)
  if (!belongs) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }
  return null
}

/** Fetches a single assignment; non-admin users are restricted to their active org. */
const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const activeOrgId = authResult.context?.activeOrgId ?? null
  const needsOrgCheck = authResult.session.user.role !== 'admin' && activeOrgId

  const [assignment, accessError] = await Promise.all([
    getDietPlanAssignmentById(id),
    needsOrgCheck ? checkAssignmentOrgAccess(id, activeOrgId) : Promise.resolve(null),
  ])

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }
  if (accessError) return accessError

  return NextResponse.json({ data: assignment })
}

const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (authResult.session.user.role !== 'admin') {
    const accessError = await checkAssignmentOrgAccess(id, activeOrgId)
    if (accessError) return accessError
  }

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
    if (result.code === 'VALIDATION') {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    if (result.code === 'OVERLAP') {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ data: result.data })
}

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (authResult.session.user.role !== 'admin') {
    const accessError = await checkAssignmentOrgAccess(id, activeOrgId)
    if (accessError) return accessError
  }

  const deleted = await deleteDietPlanAssignment(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  return deleteSuccessWithBody(deleted)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
