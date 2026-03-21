/**
 * JSON error body returned by API routes using `apiErrorResponse`.
 * @see docs/API_ERROR_CONTRACT.md
 */
export type ApiErrorBody = {
  error: string
  details?: unknown
}

/** Narrow unknown JSON to our contract for safe `error` access. */
export function isApiErrorPayload(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error === 'string'
  )
}
