import { isApiRequestError } from "@/lib/api/api-request-error";

const NETWORK_ERROR_MESSAGE =
	"Can't reach the server. Check your connection and try again.";
const TIMEOUT_ERROR_MESSAGE = "The request took too long. Please try again.";

/**
 * The sentence to show a user for a thrown error.
 *
 * Transport failures get a written explanation — `ApiRequestError`'s own
 * message for those is developer wording. Everything else surfaces the server's
 * message verbatim, because that is where the actionable detail lives (which
 * field failed, which conflict blocked the delete).
 */
export function getUserFacingErrorMessage(
	error: unknown,
	fallback: string
): string {
	if (isApiRequestError(error)) {
		if (error.code === "network") {
			return NETWORK_ERROR_MESSAGE;
		}
		if (error.code === "timeout") {
			return TIMEOUT_ERROR_MESSAGE;
		}
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}
