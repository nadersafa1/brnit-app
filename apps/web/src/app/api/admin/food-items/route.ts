import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import {
  parseAdminFoodItemScalarFields,
  parseCategoryIdsFromForm,
} from '@/lib/api-helpers/admin-food-item-formdata'
import { parseFoodItemsQuery } from '@/lib/api-helpers/food-items-query'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { createFoodItem, listFoodItems } from '@/lib/services/food'
import { createFoodItemFormSchema } from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET — paginated list (query params only; no body)
// ---------------------------------------------------------------------------

const getHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const parsed = parseFoodItemsQuery(request)
  if (!parsed.success) return parsed.error

  const { page, perPage } = parsed.query
  const { items, totalItems } = await listFoodItems(parsed.query)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

// ---------------------------------------------------------------------------
// POST — multipart create (optional image file + scalar fields + categoryIds[])
// ---------------------------------------------------------------------------

const postHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const formData = await request.formData()
  const file = formData.get('file')

  const parsed: Record<string, unknown> = {
    ...parseAdminFoodItemScalarFields(formData),
    categoryIds: parseCategoryIdsFromForm(formData),
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
