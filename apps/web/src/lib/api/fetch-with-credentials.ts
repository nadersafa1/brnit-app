import { toApiRequestError } from "./api-request-error";
import { requireJsonSuccess } from "./error-handling";

export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export interface FetchWithCredentialsOptions {
	body?: string | FormData;
	headers?: Record<string, string>;
	method?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}

/**
 * Cookie-authenticated fetch. `credentials: "include"` is what carries the
 * better-auth session cross-origin — the SPA and the API are different origins,
 * so the server's CORS config must allow credentials for this to work.
 *
 * `Content-Type: application/json` is set only for string bodies: a `FormData`
 * body needs the browser to generate its own multipart boundary, and setting
 * the header by hand breaks every multipart endpoint.
 */
async function fetchWithCredentials(
	url: string,
	options?: FetchWithCredentialsOptions
): Promise<Response> {
	const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const init: RequestInit = {
		body: options?.body,
		credentials: "include",
		method: options?.method ?? "GET",
		signal: options?.signal ?? AbortSignal.timeout(timeoutMs),
	};

	const requestHeaders: Record<string, string> = { ...options?.headers };
	if (options?.body && !(options.body instanceof FormData)) {
		requestHeaders["Content-Type"] = "application/json";
	}
	if (Object.keys(requestHeaders).length > 0) {
		init.headers = requestHeaders;
	}

	try {
		return await fetch(url, init);
	} catch (error: unknown) {
		throw toApiRequestError(error);
	}
}

export async function fetchJsonWithCredentials<T = unknown>(
	url: string,
	options?: FetchWithCredentialsOptions
): Promise<T> {
	const response = await fetchWithCredentials(url, options);
	return requireJsonSuccess<T>(response, `Request failed: ${response.status}`);
}
