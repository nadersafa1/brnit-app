import { NextResponse } from 'next/server'

/**
 * Standard DELETE success responses for API routes.
 * Use these for consistent response shape and status codes across delete endpoints.
 *
 * Convention:
 * - Success: always 200 with JSON body.
 *   - When returning the deleted resource (for cache/UI): `{ data: <entity> }`
 *   - When no resource is returned: `{ data: { deleted: true } }`
 * - Errors: `{ error: string }` with 4xx status (404, 403, 400).
 */

/** Returns 200 with `{ data: { deleted: true } }` for DELETE success when no body is returned. */
export function deleteSuccess() {
  return NextResponse.json({ data: { deleted: true } }, { status: 200 })
}

/** Returns 200 with `{ data: body }` for DELETE success when returning the deleted entity. */
export function deleteSuccessWithBody<T>(body: T) {
  return NextResponse.json({ data: body }, { status: 200 })
}
