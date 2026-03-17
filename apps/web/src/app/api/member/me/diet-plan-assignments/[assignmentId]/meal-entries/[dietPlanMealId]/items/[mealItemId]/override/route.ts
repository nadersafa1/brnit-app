import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccess } from '@/lib/api-helpers/delete-responses'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { upsertMealItemOverride, deleteMealItemOverride } from '@/lib/services/diet-plan-meal-item-override'
import {
  setDietPlanMealItemOverrideBodySchema,
  dateStringSchema,
} from '@/types/api/diet-plan-meal-item-override.schemas'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{
    assignmentId: string
    dietPlanMealId: string
    mealItemId: string
  }>
}

/** PUT/PATCH: upsert override (body.date optional — when set, override applies that day only; else future-only). */
async function handlePutOrPatch(request: NextRequest, params: RouteParams['params']) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { assignmentId, dietPlanMealId, mealItemId } = await params
  const body = await request.json()
  const parseResult = setDietPlanMealItemOverrideBodySchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await upsertMealItemOverride(
    authResult.session.user.id,
    assignmentId,
    dietPlanMealId,
    mealItemId,
    parseResult.data
  )

  if (!result.ok) {
    if (result.code === 'FORBIDDEN') {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }
    return NextResponse.json({ error: result.error }, { status: result.code === 'NOT_FOUND' ? 404 : 400 })
  }

  const status = result.created ? 201 : 200
  return NextResponse.json(
    {
      data: {
        id: result.data.id,
        dietPlanAssignmentId: result.data.dietPlanAssignmentId,
        dietPlanMealId: result.data.dietPlanMealId,
        mealItemId: result.data.mealItemId,
        foodItemId: result.data.foodItemId,
        quantity: Number(result.data.quantity),
        effectiveDate: result.data.effectiveDate ?? null,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      },
    },
    { status }
  )
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return handlePutOrPatch(request, context.params)
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return handlePutOrPatch(request, context.params)
}

/**
 * DELETE: remove override for this meal item.
 * Optional ?date=YYYY-MM-DD removes that date's override; omit to remove future-only override.
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { assignmentId, dietPlanMealId, mealItemId } = await context.params
  const dateParam = new URL(request.url).searchParams.get('date')?.trim()
  let date: string | undefined
  if (dateParam) {
    const parsed = dateStringSchema.safeParse(dateParam)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid date query parameter', details: flattenError(parsed.error) },
        { status: 400 }
      )
    }
    date = parsed.data
  } else {
    date = undefined
  }

  const result = await deleteMealItemOverride(
    authResult.session.user.id,
    assignmentId,
    dietPlanMealId,
    mealItemId,
    date
  )

  if (!result.ok) {
    if (result.code === 'FORBIDDEN') {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return deleteSuccess()
}
