import { db } from '@burn-app/db'
import {
  dietPlanAssignment,
  dietPlanMeal,
  dietPlanMealItemOverride,
  member,
  mealItem,
  foodItem,
} from '@burn-app/db/schema'
import { and, eq } from 'drizzle-orm'
import type { SetDietPlanMealItemOverrideBody } from '@/types/api/diet-plan-meal-item-override.schemas'

type AssignmentForUser = { id: string; dietPlanId: string }

async function getAssignmentForUser(
  userId: string,
  assignmentId: string
): Promise<AssignmentForUser | null> {
  const memberIds = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, userId))
  const memberIdList = memberIds.map((m) => m.id)

  const [row] = await db
    .select({
      id: dietPlanAssignment.id,
      userId: dietPlanAssignment.userId,
      memberId: dietPlanAssignment.memberId,
      dietPlanId: dietPlanAssignment.dietPlanId,
    })
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.id, assignmentId))
    .limit(1)

  if (!row) return null
  if (row.userId === userId) return { id: row.id, dietPlanId: row.dietPlanId }
  if (row.memberId && memberIdList.includes(row.memberId)) {
    return { id: row.id, dietPlanId: row.dietPlanId }
  }
  return null
}

export type UpsertOverrideResult =
  | { ok: true; data: (typeof dietPlanMealItemOverride.$inferSelect); created: boolean }
  | {
      ok: false
      error: string
      code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'
    }

export async function upsertMealItemOverride(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  body: SetDietPlanMealItemOverrideBody
): Promise<UpsertOverrideResult> {
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }

  const [dpm] = await db
    .select({ id: dietPlanMeal.id, mealId: dietPlanMeal.mealId })
    .from(dietPlanMeal)
    .where(
      and(
        eq(dietPlanMeal.id, dietPlanMealId),
        eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)
      )
    )
    .limit(1)
  if (!dpm) {
    return {
      ok: false,
      error: 'Diet plan meal not found or does not belong to this assignment',
      code: 'NOT_FOUND',
    }
  }

  const [mi] = await db
    .select({ id: mealItem.id })
    .from(mealItem)
    .where(and(eq(mealItem.id, mealItemId), eq(mealItem.mealId, dpm.mealId)))
    .limit(1)
  if (!mi) {
    return {
      ok: false,
      error: 'Meal item not found or does not belong to this diet plan meal',
      code: 'NOT_FOUND',
    }
  }

  const [food] = await db
    .select({ id: foodItem.id })
    .from(foodItem)
    .where(eq(foodItem.id, body.foodItemId))
    .limit(1)
  if (!food) {
    return { ok: false, error: 'Food item not found', code: 'VALIDATION' }
  }

  const [existing] = await db
    .select()
    .from(dietPlanMealItemOverride)
    .where(
      and(
        eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
        eq(dietPlanMealItemOverride.dietPlanMealId, dietPlanMealId),
        eq(dietPlanMealItemOverride.mealItemId, mealItemId)
      )
    )
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(dietPlanMealItemOverride)
      .set({
        foodItemId: body.foodItemId,
        quantity: String(body.quantity),
      })
      .where(eq(dietPlanMealItemOverride.id, existing.id))
      .returning()
    if (!updated) return { ok: false, error: 'Failed to update override', code: 'VALIDATION' }
    return { ok: true, data: updated, created: false }
  }

  const [created] = await db
    .insert(dietPlanMealItemOverride)
    .values({
      dietPlanAssignmentId: assignmentId,
      dietPlanMealId,
      mealItemId,
      foodItemId: body.foodItemId,
      quantity: String(body.quantity),
    })
    .returning()
  if (!created) return { ok: false, error: 'Failed to create override', code: 'VALIDATION' }
  return { ok: true, data: created, created: true }
}

export type DeleteOverrideResult =
  | { ok: true }
  | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' }

export async function deleteMealItemOverride(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string
): Promise<DeleteOverrideResult> {
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }

  const [dpm] = await db
    .select({ id: dietPlanMeal.id })
    .from(dietPlanMeal)
    .where(
      and(
        eq(dietPlanMeal.id, dietPlanMealId),
        eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)
      )
    )
    .limit(1)
  if (!dpm) {
    return {
      ok: false,
      error: 'Diet plan meal not found or does not belong to this assignment',
      code: 'NOT_FOUND',
    }
  }

  const [deleted] = await db
    .delete(dietPlanMealItemOverride)
    .where(
      and(
        eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
        eq(dietPlanMealItemOverride.dietPlanMealId, dietPlanMealId),
        eq(dietPlanMealItemOverride.mealItemId, mealItemId)
      )
    )
    .returning({ id: dietPlanMealItemOverride.id })
  return deleted ? { ok: true } : { ok: false, error: 'Override not found', code: 'NOT_FOUND' }
}

export type OverrideRow = {
  dietPlanMealId: string
  mealItemId: string
  foodItemId: string
  foodName: string
  quantity: string
}

export async function getOverridesByAssignmentId(
  assignmentId: string
): Promise<OverrideRow[]> {
  const rows = await db
    .select({
      dietPlanMealId: dietPlanMealItemOverride.dietPlanMealId,
      mealItemId: dietPlanMealItemOverride.mealItemId,
      foodItemId: dietPlanMealItemOverride.foodItemId,
      foodName: foodItem.name,
      quantity: dietPlanMealItemOverride.quantity,
    })
    .from(dietPlanMealItemOverride)
    .innerJoin(foodItem, eq(dietPlanMealItemOverride.foodItemId, foodItem.id))
    .where(eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId))
  return rows
}
