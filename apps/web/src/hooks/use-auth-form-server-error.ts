import { useCallback, useState } from "react";

interface AuthClientErrorPayload {
	error?: {
		message?: string;
		status?: number;
		statusText?: string;
	};
}

/** better-auth's callbacks hand back `{ error }` rather than throwing. */
export function getAuthClientErrorMessage(
	payload: AuthClientErrorPayload
): string | null {
	return payload.error?.message ?? payload.error?.statusText ?? null;
}

export function getAuthClientErrorStatus(
	payload: AuthClientErrorPayload
): number | undefined {
	return payload.error?.status;
}

/**
 * Holds the form-level (server) error, separate from react-hook-form's field
 * errors. Clearing on submit is the caller's job, so a stale reason never
 * outlives the attempt that produced it.
 */
export function useAuthFormServerError() {
	const [serverError, setServerError] = useState<string | null>(null);

	const clearServerError = useCallback(() => {
		setServerError(null);
	}, []);

	const reportServerError = useCallback((message: string) => {
		setServerError(message);
	}, []);

	return { clearServerError, reportServerError, serverError };
}
