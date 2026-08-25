import { NextRequest } from 'next/server'
import { cloneMealResultToNextResponse } from '@/lib/api-helpers/meal-clone-response'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { cloneMeal } from '@/lib/services/meals'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

const postHandler = async (request: NextRequest, { params }: Params) => {
  const [authResult, { id }] = await Promise.all([requireNutritionist(request.headers), params])
  if (authResult.error) return authResult.error

  const result = await cloneMeal(id)
  return cloneMealResultToNextResponse(result)
}

export const POST = withRequestLogging(postHandler)
