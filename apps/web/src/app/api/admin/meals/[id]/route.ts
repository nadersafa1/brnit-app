import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { getMealById, updateMeal, deleteMeal } from '@/lib/services/meals'
import { updateMealSchema } from '@/types/api/meal.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const mealData = await getMealById(id)

  if (!mealData) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  }

  return NextResponse.json({ data: mealData })
}

const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateMealSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await updateMeal(id, parseResult.data)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data })
}

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteMeal(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  }

  return deleteSuccessWithBody(deleted)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
