import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { getConsumptionStreakForUser } from '@/lib/services/consumption-streak'
import { consumptionStreakResponseSchema } from '@/types/api/consumption-streak.schemas'

export const dynamic = 'force-dynamic'

/**
 * GET: Current consumption streak (consecutive days with at least one logged meal, ending today).
 * Returns { streak: number }. No query params required.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const result = await getConsumptionStreakForUser(authResult.session.user.id)
  const parsed = consumptionStreakResponseSchema.safeParse(result)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid response from streak service' }, { status: 500 })
  }
  return NextResponse.json(parsed.data)
}
