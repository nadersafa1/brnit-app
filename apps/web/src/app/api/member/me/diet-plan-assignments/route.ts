import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { db } from '@burn-app/db'
import { dietPlanAssignment, dietPlan, member } from '@burn-app/db/schema'
import { eq, or, inArray, asc } from 'drizzle-orm'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

/** List diet plan assignments for the current user (as user or as member). */
async function getHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id

  const memberIds = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, userId))

  const memberIdList = memberIds.map(m => m.id)

  const conditions = [eq(dietPlanAssignment.userId, userId)]
  if (memberIdList.length > 0) {
    conditions.push(inArray(dietPlanAssignment.memberId, memberIdList))
  }

  const items = await db
    .select({
      id: dietPlanAssignment.id,
      dietPlanId: dietPlanAssignment.dietPlanId,
      startDate: dietPlanAssignment.startDate,
      endDate: dietPlanAssignment.endDate,
      createdAt: dietPlanAssignment.createdAt,
      planName: dietPlan.name,
    })
    .from(dietPlanAssignment)
    .innerJoin(dietPlan, eq(dietPlanAssignment.dietPlanId, dietPlan.id))
    .where(or(...conditions))
    .orderBy(asc(dietPlanAssignment.startDate))

  return NextResponse.json({ data: items })
}

export const GET = withRequestLogging(getHandler)
