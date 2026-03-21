import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
} from '@/lib/services/food'
import { updateFoodItemFormSchema } from '@/types/api/food.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

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

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const item = await getFoodItemById(id)

  if (!item) {
    return apiErrorResponse('Food item not found', 404)
  }

  return NextResponse.json({ data: item })
}

const patchHandler = async (request: NextRequest, { params }: Params) => {
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
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = parseResult.data.clearImage === true
  const formPayload = { ...parseResult.data }
  delete (formPayload as Record<string, unknown>)['clearImage']
  const hasFormFields = FORM_FIELDS.some((k) => parsed[k] !== undefined)
  if (!hasFormFields && !uploadFile && !clearImage) {
    return apiErrorResponse(
      'At least one field, file, or clearImage must be provided for update',
      400
    )
  }

  const result = await updateFoodItem(id, formPayload, {
    file: uploadFile,
    clearImage,
  })

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    if (result.code === 'CONFLICT') {
      return apiErrorResponse(result.error, 409)
    }
    return apiErrorResponse(result.error, 400)
  }

  return NextResponse.json({ data: result.data })
}

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const result = await deleteFoodItem(id)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    return apiErrorResponse(result.error, 409)
  }

  return deleteSuccessWithBody(result.data)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
