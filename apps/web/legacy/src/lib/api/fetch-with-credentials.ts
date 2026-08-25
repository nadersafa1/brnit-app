/**
 * Cookie-authenticated fetch for browser-side API calls.
 * Sets JSON Content-Type only when `body` is a string (not FormData).
 */

import { requireJsonSuccess } from '@/lib/api/error-handling'

export function fetchWithCredentials(
  url: string,
  options?: { method?: string; body?: string | FormData }
): Promise<Response> {
  const init: RequestInit = {
    credentials: 'include',
    method: options?.method ?? 'GET',
    body: options?.body,
  }
  if (options?.body && !(options.body instanceof FormData)) {
    init.headers = { 'Content-Type': 'application/json' }
  }
  return fetch(url, init)
}

/**
 * Same as `fetchWithCredentials` + parse JSON on success; on failure reads `error` from `ApiErrorBody`.
 * Use for list/detail query functions in `lib/queries` (same contract as hooks).
 */
export async function fetchJsonWithCredentials<T = unknown>(
  url: string,
  options?: { method?: string; body?: string | FormData }
): Promise<T> {
  const res = await fetchWithCredentials(url, options)
  return requireJsonSuccess<T>(res, `Request failed: ${res.status}`)
}
