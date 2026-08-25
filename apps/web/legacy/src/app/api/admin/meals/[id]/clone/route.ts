import { NextRequest } from 'next/server'
import { cloneMealResultToNextResponse } from '@/lib/api-helpers/meal-clone-response'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { cloneMeal } from '@/lib/services/meals'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const postHandler = async (request: NextRequest, { params }: Params) => {
  // Auth and route params are independent; resolve both in one turn to reduce latency.
  const [authResult, { id }] = await Promise.all([requireAdmin(request.headers), params])
  if (authResult.error) return authResult.error

  const result = await cloneMeal(id)
  return cloneMealResultToNextResponse(result)
}

export const POST = withRequestLogging(postHandler)
