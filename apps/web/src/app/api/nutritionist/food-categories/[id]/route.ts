import { NextRequest, NextResponse } from 'next/server'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getFoodCategoryById } from '@/lib/services/food'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const category = await getFoodCategoryById(id)

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ data: category })
}

export const GET = withRequestLogging(getHandler)
