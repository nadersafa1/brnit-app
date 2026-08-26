import { ApiError } from "./types";

/**
 * User-facing message for an unknown error, with optional per-status overrides
 * (e.g. a friendlier line for 409 or 404 than whatever the API sent).
 */
export function getApiErrorMessage(
	error: unknown,
	fallback: string,
	statusMessages?: Partial<Record<number, string>>
): string {
	if (error instanceof ApiError) {
		const override = statusMessages?.[error.status];
		if (override !== undefined) {
			return override;
		}
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}
