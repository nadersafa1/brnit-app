import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { currentDietPlanQuerySchema } from '@/types/api/current-diet-plan.schemas'
import { getCurrentDietPlanForUser } from '@/lib/services/current-diet-plan'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

async function getHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = currentDietPlanQuerySchema.safeParse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 },
    )
  }

  const userId = authResult.session.user.id
  const result = await getCurrentDietPlanForUser(userId, parseResult.data)

  return NextResponse.json(result)
}


export const GET = withRequestLogging(getHandler)
