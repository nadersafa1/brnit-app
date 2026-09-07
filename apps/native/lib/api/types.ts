import type { ApiErrorBody } from "@brnit/api";

/**
 * `flattenError(...)` output from the server's Zod validation, carried in the
 * `details` field of the error envelope. `ApiErrorBody["details"]` is `unknown`
 * because a handler may attach anything; validation failures are the only kind
 * the app reads, so this narrows to their shape.
 */
export interface ApiErrorDetails {
	fieldErrors: Record<string, string[]>;
	formErrors: string[];
}

/** The error envelope every non-2xx response returns, with `details` narrowed. */
export type ApiErrorResponse = Omit<ApiErrorBody, "details"> & {
	details?: ApiErrorDetails;
};

export class ApiError extends Error {
	details?: ApiErrorDetails;
	status: number;

	constructor(status: number, message: string, details?: ApiErrorDetails) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

export interface ApiFetchOptions {
	body?: unknown;
	headers?: Record<string, string>;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	signal?: AbortSignal;
}
