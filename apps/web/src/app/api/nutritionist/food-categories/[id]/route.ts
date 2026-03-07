import { NextRequest, NextResponse } from 'next/server'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getFoodCategoryById } from '@/lib/services/food'

type Params = { params: Promise<{ id: string }> }

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const category = await getFoodCategoryById(id)

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ data: category })
}
