import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccess } from '@/lib/api-helpers/delete-responses'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { db } from '@burn-app/db'
import { dietPlanAssignment, member } from '@burn-app/db/schema'
import { eq, or, inArray, sql } from 'drizzle-orm'
import {
  logDietPlanMealConsumption,
  listDietPlanMealConsumptions,
  deleteDietPlanMealConsumptionBySlot,
} from '@/lib/services/diet-plan-meal-consumption'
import {
  createDietPlanMealConsumptionSchema,
  dietPlanMealConsumptionQuerySchema,
  deleteDietPlanMealConsumptionBySlotSchema,
} from '@/types/api/diet-plan-meal-consumption.schemas'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'

export const dynamic = 'force-dynamic'

type AssignmentRow = {
  id: string
  userId: string | null
  memberId: string | null
  startDate: string
  endDate: string
}

/**
 * Fetches the assignment if it belongs to the current user (direct or via member).
 * Used to restrict list/delete to the user's assignments only.
 */
async function getAssignmentForUser(
  userId: string,
  assignmentId: string
): Promise<AssignmentRow | null> {
  const [memberRows, assignmentRows] = await Promise.all([
    db.select({ id: member.id }).from(member).where(eq(member.userId, userId)),
    db
      .select({
        id: dietPlanAssignment.id,
        userId: dietPlanAssignment.userId,
        memberId: dietPlanAssignment.memberId,
        startDate: dietPlanAssignment.startDate,
        endDate: dietPlanAssignment.endDate,
      })
      .from(dietPlanAssignment)
      .where(eq(dietPlanAssignment.id, assignmentId))
      .limit(1),
  ])
  const memberIdSet = new Set(memberRows.map((m) => m.id))
  const [row] = assignmentRows
  if (!row) return null
  if (row.userId === userId) return row
  if (row.memberId && memberIdSet.has(row.memberId)) return row
  return null
}

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function getGraceDays(): number {
  const parsed = Number.parseInt(process.env.DIET_PLAN_CONSUMPTION_GRACE_DAYS ?? '2', 10)
  const value = Number.isNaN(parsed) || parsed < 0 ? 2 : parsed
  return Math.max(0, value)
}

/** Lists consumptions for the current user (optionally filtered by assignment and date range). */
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

  // Restrict to assignments the user owns or is linked to (direct or via member).
  // When no assignment filter is given, resolve all assignment ids the user can see.
  if (parseResult.data.dietPlanAssignmentId) {
    const assignment = await getAssignmentForUser(userId, parseResult.data.dietPlanAssignmentId)
    if (!assignment) {
      return NextResponse.json({ error: 'Forbidden: assignment not found or access denied' }, { status: 403 })
    }
  } else {
    const memberRows = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId))
    const memberIdList = memberRows.map((m) => m.id)
    const userAssignments = await db
      .select({ id: dietPlanAssignment.id })
      .from(dietPlanAssignment)
      .where(
        or(
          eq(dietPlanAssignment.userId, userId),
          memberIdList.length > 0 ? inArray(dietPlanAssignment.memberId, memberIdList) : sql`false`
        )
      )
    const assignmentIds = userAssignments.map((a) => a.id)
    if (assignmentIds.length === 0) {
      return NextResponse.json(createPaginatedResponse([], parseResult.data.page ?? 1, parseResult.data.perPage ?? 25, 0))
    }
    parseResult.data.dietPlanAssignmentIds = assignmentIds
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanMealConsumptions(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

/** Creates a meal consumption (mark as consumed). Validates assignment and date range before calling service. */
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

  const assignment = await getAssignmentForUser(
    authResult.session.user.id,
    parseResult.data.dietPlanAssignmentId
  )
  if (!assignment) {
    return NextResponse.json({ error: 'Forbidden: assignment not found or access denied' }, { status: 403 })
  }

  const consumedAt = parseResult.data.consumedAt instanceof Date
    ? parseResult.data.consumedAt
    : new Date(parseResult.data.consumedAt)
  const consumedDate = consumedAt.toISOString().slice(0, 10)
  const graceDays = getGraceDays()
  const maxAllowedDate = addDaysToDateString(assignment.endDate, graceDays)

  if (consumedDate < assignment.startDate || consumedDate > maxAllowedDate) {
    return NextResponse.json(
      {
        error:
          'consumedAt must be within the assignment period (startDate to endDate + grace days)',
        details: {
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          graceDays,
        },
      },
      { status: 400 }
    )
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

/** Deletes a consumption by slot (assignment + meal + date). Used by member app to unmark consumed. */
export const DELETE = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json().catch(() => ({}))
  const parseResult = deleteDietPlanMealConsumptionBySlotSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const assignment = await getAssignmentForUser(
    authResult.session.user.id,
    parseResult.data.dietPlanAssignmentId
  )
  if (!assignment) {
    return NextResponse.json({ error: 'Forbidden: assignment not found or access denied' }, { status: 403 })
  }

  const deleted = await deleteDietPlanMealConsumptionBySlot(
    parseResult.data.dietPlanAssignmentId,
    parseResult.data.dietPlanMealId,
    parseResult.data.consumedDate
  )

  if (!deleted) {
    return NextResponse.json({ error: 'Consumption not found' }, { status: 404 })
  }

  return deleteSuccess()
}
