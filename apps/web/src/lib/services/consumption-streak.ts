import { db } from '@brnit/db'
import { dietPlanAssignment, dietPlanMealConsumption, member } from '@brnit/db/schema'
import { and, eq, gte, inArray, or, SQL } from 'drizzle-orm'
import { addDaysUTC, toDateStringUTC } from '@/lib/helpers/date-utc'

/** Normalize consumed_date from DB (string or Date) to YYYY-MM-DD for set membership. */
function toConsumedDateKey(consumedDate: string | Date): string {
  return typeof consumedDate === 'string' ? consumedDate : consumedDate.toISOString().slice(0, 10)
}

/**
 * Returns member IDs linked to the given user.
 * Used to include assignments where the user is the assignee via membership (e.g. client profile).
 */
async function getUserMemberIds(userId: string): Promise<string[]> {
  const rows = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId))
  return rows.map(r => r.id)
}

/**
 * Returns the current consumption streak: consecutive calendar days with at least
 * one logged meal, ending at today (UTC). If the user did not log today, returns 0.
 * Considers all of the user's diet plan assignments (direct userId or via memberId).
 */
export async function getConsumptionStreakForUser(userId: string): Promise<{ streak: number }> {
  // --- Resolve assignment IDs the user can see (direct or via member) ---
  const memberIds = await getUserMemberIds(userId)
  const assigneeConditions: SQL<unknown>[] = [eq(dietPlanAssignment.userId, userId)]
  if (memberIds.length > 0) {
    assigneeConditions.push(inArray(dietPlanAssignment.memberId, memberIds))
  }

  const assignmentRows = await db
    .select({ id: dietPlanAssignment.id })
    .from(dietPlanAssignment)
    .where(or(...assigneeConditions))

  const assignmentIds = assignmentRows.map(r => r.id)
  if (assignmentIds.length === 0) {
    return { streak: 0 }
  }

  // --- Fetch distinct consumed dates (at least one meal per day) in a bounded window ---
  const today = toDateStringUTC(new Date())
  const fromDate = addDaysUTC(today, -365)

  const consumptionRows = await db
    .select({ consumedDate: dietPlanMealConsumption.consumedDate })
    .from(dietPlanMealConsumption)
    .where(
      and(
        inArray(dietPlanMealConsumption.dietPlanAssignmentId, assignmentIds),
        gte(dietPlanMealConsumption.consumedDate, fromDate)
      )
    )

  const consumedDates = new Set(consumptionRows.map(r => toConsumedDateKey(r.consumedDate)))

  // --- Streak = consecutive days ending today; no consumption today => 0 ---
  if (!consumedDates.has(today)) {
    return { streak: 0 }
  }

  let streak = 0
  let cursor = today
  while (consumedDates.has(cursor)) {
    streak += 1
    cursor = addDaysUTC(cursor, -1)
  }

  return { streak }
}
