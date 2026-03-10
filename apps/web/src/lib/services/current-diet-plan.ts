import { db } from '@burn-app/db'
import { dietPlan, dietPlanAssignment, dietPlanMealConsumption, member } from '@burn-app/db/schema'
import { and, asc, eq, inArray, or, SQL } from 'drizzle-orm'
import { getDietPlanById } from '@/lib/services/diet-plans'
import type { CurrentDietPlanQuery } from '@/types/api/current-diet-plan.schemas'

function toDateStringUTC(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStringUTC(d)
}

function diffDaysInclusiveUTC(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T00:00:00.000Z`)
  const diffMs = toDate.getTime() - fromDate.getTime()
  return diffMs / (1000 * 60 * 60 * 24) + 1
}

function getTodayUTC(): string {
  return toDateStringUTC(new Date())
}

type CurrentDietPlanMeal = {
  dietPlanMealId: string
  mealId: string
  mealName: string
  mealType: string
  mealOrder: number
  mealItems: Array<{ foodName: string; quantity: number }>
  consumed: boolean
  consumedAt?: string
}

type CurrentDietPlanDay = {
  date: string
  meals: CurrentDietPlanMeal[]
}

type CurrentDietPlanAssignment = {
  id: string
  dietPlanId: string
  startDate: string
  endDate: string
  planName: string
}

export type CurrentDietPlanResult =
  | { data: null }
  | {
      data: {
        assignment: CurrentDietPlanAssignment
        plan: {
          id: string
          name: string
          description: string | null
        }
        days: CurrentDietPlanDay[]
      }
    }

async function getUserMemberIds(userId: string): Promise<string[]> {
  const rows = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId))
  return rows.map((m) => m.id)
}

export async function getCurrentDietPlanForUser(
  userId: string,
  query: CurrentDietPlanQuery,
): Promise<CurrentDietPlanResult> {
  const today = getTodayUTC()
  const from = query.from ?? today
  const to = query.to ?? addDaysUTC(from, 6)

  // Resolve member IDs linked to this user
  const memberIds = await getUserMemberIds(userId)

  const assigneeConditions: SQL<unknown>[] = [eq(dietPlanAssignment.userId, userId)]
  if (memberIds.length > 0) {
    assigneeConditions.push(inArray(dietPlanAssignment.memberId, memberIds))
  }

  const rows = await db
    .select({
      id: dietPlanAssignment.id,
      dietPlanId: dietPlanAssignment.dietPlanId,
      startDate: dietPlanAssignment.startDate,
      endDate: dietPlanAssignment.endDate,
      planName: dietPlan.name,
    })
    .from(dietPlanAssignment)
    .innerJoin(dietPlan, eq(dietPlanAssignment.dietPlanId, dietPlan.id))
    .where(and(or(...assigneeConditions)))
    .orderBy(asc(dietPlanAssignment.startDate))

  if (rows.length === 0) {
    return { data: null }
  }

  // Pick assignment that contains the first day of the range (from).
  const containing = rows.filter((r) => r.startDate <= from && r.endDate >= from)
  const assignment = (containing.length > 0 ? containing : rows)[0]

  const planFull = await getDietPlanById(assignment.dietPlanId)
  if (!planFull) {
    return { data: null }
  }

  const plan = {
    id: planFull.id,
    name: planFull.name,
    description: planFull.description,
  }

  const allDates: string[] = []
  let cursor = from
  while (cursor <= to) {
    if (cursor >= assignment.startDate && cursor <= assignment.endDate) {
      allDates.push(cursor)
    }
    cursor = addDaysUTC(cursor, 1)
  }

  if (allDates.length === 0) {
    return { data: null }
  }

  const dietPlanMeals = planFull.dietPlanMeals ?? []

  const consumptionRows =
    allDates.length > 0
      ? await db
          .select({
            dietPlanMealId: dietPlanMealConsumption.dietPlanMealId,
            consumedDate: dietPlanMealConsumption.consumedDate,
            consumedAt: dietPlanMealConsumption.consumedAt,
          })
          .from(dietPlanMealConsumption)
          .where(
            and(
              eq(dietPlanMealConsumption.dietPlanAssignmentId, assignment.id),
              inArray(dietPlanMealConsumption.consumedDate, allDates),
            ),
          )
      : []

  const consumptionMap = new Map<string, { consumedAt: string }>()
  for (const row of consumptionRows) {
    const key = `${row.dietPlanMealId}:${row.consumedDate}`
    consumptionMap.set(key, { consumedAt: row.consumedAt.toISOString() })
  }

  const days: CurrentDietPlanDay[] = allDates.map((date) => {
    const planDay =
      diffDaysInclusiveUTC(assignment.startDate, date) // 1-based

    const mealsForDay = dietPlanMeals
      .filter((pm) => pm.dayNumber === 0 || pm.dayNumber === planDay)
      .sort((a, b) => {
        if (a.mealType === b.mealType) {
          return a.mealOrder - b.mealOrder
        }
        return a.mealType.localeCompare(b.mealType)
      })
      .map<CurrentDietPlanMeal>((pm) => {
        const key = `${pm.id}:${date}`
        const consumption = consumptionMap.get(key)
        return {
          dietPlanMealId: pm.id,
          mealId: pm.mealId,
          mealName: pm.mealName,
          mealType: pm.mealType,
          mealOrder: pm.mealOrder,
          mealItems: pm.mealItems ?? [],
          consumed: !!consumption,
          consumedAt: consumption?.consumedAt,
        }
      })

    return {
      date,
      meals: mealsForDay,
    }
  })

  return {
    data: {
      assignment: {
        id: assignment.id,
        dietPlanId: assignment.dietPlanId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        planName: assignment.planName,
      },
      plan,
      days,
    },
  }
}

