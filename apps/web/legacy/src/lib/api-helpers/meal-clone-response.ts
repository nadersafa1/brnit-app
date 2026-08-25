import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import type { CloneMealResult } from '@/lib/services/meals'

/**
 * Maps a `cloneMeal` service result to the HTTP contract used by admin and nutritionist clone routes.
 * Keeps status codes and payload shape identical across both entry points.
 */
export function cloneMealResultToNextResponse(result: CloneMealResult): NextResponse {
  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    return apiErrorResponse(result.error, 500)
  }
  return NextResponse.json({ data: result.data }, { status: 201 })
}
