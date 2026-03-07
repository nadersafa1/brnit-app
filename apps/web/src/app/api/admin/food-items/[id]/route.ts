import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
} from '@/lib/services/food'
import { updateFoodItemSchema } from '@/types/api/food.schemas'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const item = await getFoodItemById(id)

  if (!item) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: item })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const body = await request.json()
  const parseResult = updateFoodItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const hasUpdates = Object.values(parseResult.data).some(v => v !== undefined)
  if (!hasUpdates) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await updateFoodItem(id, parseResult.data)

  if (!updated) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: updated })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const deleted = await deleteFoodItem(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}
