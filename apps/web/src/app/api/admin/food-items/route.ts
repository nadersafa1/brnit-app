import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { parseFoodItemsQuery } from '@/lib/api-helpers/food-items-query'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { createFoodItem, listFoodItems } from '@/lib/services/food'
import { createFoodItemFormSchema } from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

/** FormData keys accepted by POST (create food item). fdcId optional; macros required by schema. */
const CREATE_FORM_FIELDS = [
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

/** List food items (admin). Uses shared query parsing and listFoodItems service. */
const getHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const parsed = parseFoodItemsQuery(request)
  if (!parsed.success) return parsed.error

  const { page, perPage } = parsed.query
  const { items, totalItems } = await listFoodItems(parsed.query)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

/** Create food item (multipart form). Validates body with createFoodItemFormSchema; macros required. */
const postHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const formData = await request.formData()
  const file = formData.get('file')

  // Build body from allowed form keys; skip empty strings so schema coercion applies correctly.
  const parsed: Record<string, unknown> = {}
  for (const key of CREATE_FORM_FIELDS) {
    const val = formData.get(key)
    if (typeof val === 'string' && val.trim() !== '') parsed[key] = val
  }

  const parseResult = createFoodItemFormSchema.safeParse(parsed)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const newItem = await createFoodItem(parseResult.data, { file: uploadFile })

  if (!newItem) {
    return NextResponse.json({ error: 'Failed to create food item' }, { status: 500 })
  }

  return NextResponse.json({ data: newItem }, { status: 201 })
}

export const GET = withRequestLogging(getHandler, { actionName: 'AdminListFoodItems' })
export const POST = withRequestLogging(postHandler, { actionName: 'AdminCreateFoodItem' })
