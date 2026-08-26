/**
 * `http` — the server answered with a non-2xx status.
 * `network` — the request never completed (offline, DNS, CORS).
 * `timeout` — the 30 s `AbortSignal.timeout` fired.
 */
export type ApiRequestErrorCode = "http" | "network" | "timeout";

export class ApiRequestError extends Error {
	/** Machine-readable code from the body (`OVERLAP`, `NO_ORGANIZATION`, …). */
	readonly apiCode?: string;
	readonly code: ApiRequestErrorCode;
	/** Zod `flattenError()` output on 400s; opaque otherwise. */
	readonly details?: unknown;
	/** HTTP status, or `0` for network and timeout failures. */
	readonly status: number;

	constructor(
		message: string,
		options: {
			apiCode?: string;
			cause?: unknown;
			code: ApiRequestErrorCode;
			details?: unknown;
			status: number;
		}
	) {
		super(message, { cause: options.cause });
		this.name = "ApiRequestError";
		this.apiCode = options.apiCode;
		this.code = options.code;
		this.details = options.details;
		this.status = options.status;
	}
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
	return error instanceof ApiRequestError;
}

export function isNetworkFetchError(error: unknown): boolean {
	if (isApiRequestError(error)) {
		return error.code === "network" || error.code === "timeout";
	}
	if (error instanceof TypeError) {
		return true;
	}
	return error instanceof DOMException && error.name === "AbortError";
}

/** Wraps a thrown `fetch` rejection so callers only ever see `ApiRequestError`. */
export function toApiRequestError(error: unknown): ApiRequestError {
	if (isApiRequestError(error)) {
		return error;
	}

	const isTimeout =
		error instanceof DOMException && error.name === "AbortError";

	return new ApiRequestError(
		isTimeout ? "Request timed out" : "Network request failed",
		{
			cause: error,
			code: isTimeout ? "timeout" : "network",
			status: 0,
		}
	);
}
