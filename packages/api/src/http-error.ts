/**
 * Operational error carrying an HTTP status.
 *
 * Handlers throw this for failures the client is allowed to see. Anything else
 * that escapes a handler is treated as a bug and sanitized into a 500 by the
 * server's terminal error middleware.
 *
 * `causeDetail` is surfaced to the client as the `details` field of the error
 * envelope, so it must never contain secrets, raw SQL, or stack traces. Zod's
 * `flattenError(...)` output is the usual value.
 */
export class HttpError extends Error {
	readonly status: number;
	readonly causeDetail: unknown;

	constructor(status: number, message: string, causeDetail?: unknown) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.causeDetail = causeDetail;
	}
}

/** Error envelope returned by every non-2xx response. */
export interface ApiErrorBody {
	code?: string;
	details?: unknown;
	error: string;
	/** Populated outside production only. */
	stack?: string;
}
