import { NextResponse } from 'next/server'

export type { ApiErrorBody } from '@/lib/api/api-error'

export function apiErrorResponse(
  error: string,
  status: number,
  details?: unknown
): NextResponse {
  if (details === undefined) {
    return NextResponse.json({ error }, { status })
  }
  return NextResponse.json({ error, details }, { status })
}
