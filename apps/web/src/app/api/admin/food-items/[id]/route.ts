import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
} from '@/lib/services/food'
import { updateFoodItemFormSchema } from '@/types/api/food.schemas'

type Params = { params: Promise<{ id: string }> }

const FORM_FIELDS = [
  'name',
  'categoryId',
  'fdcId',
  'calories',
  'protein',
  'carbs',
  'fat',
  'servingSize',
  'unit',
  'gramsPerUnit',
] as const

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
  const formData = await request.formData()
  const file = formData.get('file')
  const clearImageRaw = formData.get('clearImage')
  const parsed: Record<string, unknown> = {}
  for (const key of FORM_FIELDS) {
    const val = formData.get(key)
    if (typeof val === 'string' && val.trim() !== '') {
      parsed[key] = val
    }
  }
  if (clearImageRaw !== null && clearImageRaw !== undefined) {
    parsed.clearImage = clearImageRaw
  }

  const parseResult = updateFoodItemFormSchema.safeParse(parsed)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = parseResult.data.clearImage === true
  const formPayload = { ...parseResult.data }
  delete (formPayload as Record<string, unknown>)['clearImage']
  const hasFormFields = FORM_FIELDS.some((k) => parsed[k] !== undefined)
  if (!hasFormFields && !uploadFile && !clearImage) {
    return NextResponse.json(
      { error: 'At least one field, file, or clearImage must be provided for update' },
      { status: 400 }
    )
  }

  const updated = await updateFoodItem(id, formPayload, {
    file: uploadFile,
    clearImage,
  })

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

  return deleteSuccessWithBody(deleted)
}
