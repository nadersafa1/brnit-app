import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { db } from '@burn-app/db'
import { dietPlanAssignment, member } from '@burn-app/db/schema'
import { eq, or, inArray, sql } from 'drizzle-orm'
import {
  logDietPlanMealConsumption,
  listDietPlanMealConsumptions,
} from '@/lib/services/diet-plan-meal-consumption'
import {
  createDietPlanMealConsumptionSchema,
  dietPlanMealConsumptionQuerySchema,
} from '@/types/api/diet-plan-meal-consumption.schemas'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { calculateOffset } from '@/lib/api-helpers/query-builders'

export const dynamic = 'force-dynamic'

/** Verify the assignment belongs to the current user. */
async function userCanAccessAssignment(
  userId: string,
  assignmentId: string
): Promise<boolean> {
  const memberIds = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, userId))
  const memberIdList = memberIds.map(m => m.id)

  const [assignment] = await db
    .select({ id: dietPlanAssignment.id })
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.id, assignmentId))
    .limit(1)

  if (!assignment) return false

  const [row] = await db
    .select({
      userId: dietPlanAssignment.userId,
      memberId: dietPlanAssignment.memberId,
    })
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.id, assignmentId))
    .limit(1)

  if (!row) return false
  if (row.userId === userId) return true
  if (row.memberId && memberIdList.includes(row.memberId)) return true
  return false
}

export const GET = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const { searchParams } = new URL(request.url)
  const parseResult = dietPlanMealConsumptionQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    dietPlanAssignmentId: searchParams.get('dietPlanAssignmentId') ?? undefined,
    consumedDateFrom: searchParams.get('consumedDateFrom') ?? undefined,
    consumedDateTo: searchParams.get('consumedDateTo') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  if (parseResult.data.dietPlanAssignmentId) {
    const canAccess = await userCanAccessAssignment(userId, parseResult.data.dietPlanAssignmentId)
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden: assignment not found or access denied' }, { status: 403 })
    }
  } else {
    const memberIds = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId))
    const memberIdList = memberIds.map(m => m.id)
    const userAssignments = await db
      .select({ id: dietPlanAssignment.id })
      .from(dietPlanAssignment)
      .where(
        or(
          eq(dietPlanAssignment.userId, userId),
          memberIdList.length > 0 ? inArray(dietPlanAssignment.memberId, memberIdList) : sql`false`
        )
      )
    const assignmentIds = userAssignments.map(a => a.id)
    if (assignmentIds.length === 0) {
      return NextResponse.json(createPaginatedResponse([], parseResult.data.page ?? 1, parseResult.data.perPage ?? 25, 0))
    }
    parseResult.data.dietPlanAssignmentIds = assignmentIds
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanMealConsumptions(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createDietPlanMealConsumptionSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const canAccess = await userCanAccessAssignment(
    authResult.session.user.id,
    parseResult.data.dietPlanAssignmentId
  )
  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden: assignment not found or access denied' }, { status: 403 })
  }

  const result = await logDietPlanMealConsumption(parseResult.data)

  if (!result.ok) {
    if (result.code === 'DUPLICATE') {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}
