import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import {
  ADMIN_FOOD_ITEM_SCALAR_FORM_FIELDS,
  mergeClearImageFieldIfPresent,
  parseAdminFoodItemScalarFields,
  parseCategoryIdsFromForm,
} from '@/lib/api-helpers/admin-food-item-formdata'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { deleteSuccessWithBody } from '@/lib/api-helpers/delete-responses'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
  type FoodItemDeleteResult,
  type FoodItemUpdateResult,
} from '@/lib/services/food'
import { updateFoodItemFormSchema } from '@/types/api/food.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

/** Build the object passed to `updateFoodItemFormSchema` from multipart fields. */
function buildFoodItemPatchParsedBody(formData: FormData): Record<string, unknown> {
  const parsed = parseAdminFoodItemScalarFields(formData)
  mergeClearImageFieldIfPresent(formData, parsed)
  const categoryIds = parseCategoryIdsFromForm(formData)
  if (categoryIds.length > 0) {
    parsed.categoryIds = categoryIds
  }
  return parsed
}

function foodItemUpdateErrorResponse(result: Extract<FoodItemUpdateResult, { ok: false }>) {
  if (result.code === 'NOT_FOUND') {
    return apiErrorResponse(result.error, 404)
  }
  if (result.code === 'CONFLICT') {
    return apiErrorResponse(result.error, 409)
  }
  return apiErrorResponse(result.error, 400)
}

function foodItemDeleteErrorResponse(result: Extract<FoodItemDeleteResult, { ok: false }>) {
  if (result.code === 'NOT_FOUND') {
    return apiErrorResponse(result.error, 404)
  }
  return apiErrorResponse(result.error, 409)
}

// ---------------------------------------------------------------------------
// GET — single item by id
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PATCH — multipart partial update (optional file / clearImage / scalars / categoryIds)
// ---------------------------------------------------------------------------

const patchHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const formData = await request.formData()
  const file = formData.get('file')
  const parsed = buildFoodItemPatchParsedBody(formData)

  const parseResult = updateFoodItemFormSchema.safeParse(parsed)
  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = parseResult.data.clearImage === true
  const formPayload = { ...parseResult.data }
  delete (formPayload as Record<string, unknown>)['clearImage']

  const hasFormFields =
    ADMIN_FOOD_ITEM_SCALAR_FORM_FIELDS.some((k) => parsed[k] !== undefined) ||
    parsed.categoryIds !== undefined
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
    return foodItemUpdateErrorResponse(result)
  }

  return NextResponse.json({ data: result.data })
}

// ---------------------------------------------------------------------------
// DELETE — remove item when not referenced by meals / overrides / consumption
// ---------------------------------------------------------------------------

const deleteHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const result = await deleteFoodItem(id)

  if (!result.ok) {
    return foodItemDeleteErrorResponse(result)
  }

  return deleteSuccessWithBody(result.data)
}

export const GET = withRequestLogging(getHandler)

export const PATCH = withRequestLogging(patchHandler)

export const DELETE = withRequestLogging(deleteHandler)
