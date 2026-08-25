/**
 * Shared helpers for normalizing API error responses across hooks and query fetchers.
 *
 * Server contract: `ApiErrorBody` (`@/lib/api/api-error`). Display **`error`** in UI; `details` is optional structured data.
 */

import { isApiErrorPayload } from '@/lib/api/api-error'

export async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const errorPayload = await response.json().catch(() => null)
  if (isApiErrorPayload(errorPayload)) return errorPayload.error
  return fallbackMessage
}

export async function requireSuccess(
  response: Response,
  fallbackMessage: string
): Promise<void> {
  if (response.ok) return
  throw new Error(await getApiErrorMessage(response, fallbackMessage))
}

/** After a successful response, parse JSON (same as `requireSuccess` then `response.json()`). */
export async function requireJsonSuccess<T = unknown>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  await requireSuccess(response, fallbackMessage)
  return response.json() as Promise<T>
}
