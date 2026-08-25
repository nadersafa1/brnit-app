import { isApiRequestError } from "@/lib/api/api-request-error";

const MAX_QUERY_ATTEMPTS = 3;
const CLIENT_ERROR_MIN_STATUS = 400;
const CLIENT_ERROR_MAX_STATUS = 500;

/**
 * Retries transient failures only. A 4xx is the server saying the request
 * itself is wrong (bad input, no session, forbidden, gone) — repeating it
 * cannot change the answer and only delays the error the user needs to see.
 */
export function shouldRetryQuery(
	failureCount: number,
	error: unknown
): boolean {
	if (failureCount >= MAX_QUERY_ATTEMPTS) {
		return false;
	}
	if (
		isApiRequestError(error) &&
		error.status >= CLIENT_ERROR_MIN_STATUS &&
		error.status < CLIENT_ERROR_MAX_STATUS
	) {
		return false;
	}
	return true;
}
