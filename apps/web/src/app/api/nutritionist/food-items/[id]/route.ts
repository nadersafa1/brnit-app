import { NextRequest, NextResponse } from 'next/server'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { getFoodItemById } from '@/lib/services/food'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const getHandler = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const { id } = await params
  const item = await getFoodItemById(id)

  if (!item) {
    return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
  }

  return NextResponse.json({ data: item })
}

export const GET = withRequestLogging(getHandler)
