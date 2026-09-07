import { readApiErrorCode, readApiErrorMessage } from "./api-error";
import { ApiRequestError } from "./api-request-error";

/**
 * Parses `{ error, code?, details? }` off a failed response into a thrown
 * {@link ApiRequestError}. Everything the app shows a user comes through here,
 * so the server's wording always wins over the caller's fallback.
 */
async function throwForFailedResponse(
	response: Response,
	fallbackMessage: string
): Promise<never> {
	const payload: unknown = await response.json().catch(() => null);
	const details =
		typeof payload === "object" && payload !== null && "details" in payload
			? (payload as { details?: unknown }).details
			: undefined;

	throw new ApiRequestError(readApiErrorMessage(payload) ?? fallbackMessage, {
		apiCode: readApiErrorCode(payload),
		code: "http",
		details,
		status: response.status,
	});
}

export async function requireSuccess(
	response: Response,
	fallbackMessage: string
): Promise<void> {
	if (response.ok) {
		return;
	}
	await throwForFailedResponse(response, fallbackMessage);
}

export async function requireJsonSuccess<T = unknown>(
	response: Response,
	fallbackMessage: string
): Promise<T> {
	await requireSuccess(response, fallbackMessage);
	return response.json() as Promise<T>;
}
