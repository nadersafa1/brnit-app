/**
 * The server's JSON error body: `{ error, code?, details?, stack? }`.
 * `@brnit/api`'s `HttpError` is the source of the shape; see
 * `docs/migration/architecture.md` -> Error contract.
 *
 * A few auth-helper responses answer `{ message }` instead of `{ error }`, so
 * both keys are accepted here rather than losing the server's wording.
 */
export interface ApiErrorBody {
	code?: string;
	details?: unknown;
	error: string;
}

interface LegacyMessageErrorBody {
	code?: string;
	message: string;
}

function hasStringField<K extends string>(
	value: unknown,
	key: K
): value is Record<K, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		key in value &&
		typeof (value as Record<K, unknown>)[key] === "string"
	);
}

export function isApiErrorPayload(value: unknown): value is ApiErrorBody {
	return hasStringField(value, "error");
}

function isLegacyMessageErrorPayload(
	value: unknown
): value is LegacyMessageErrorBody {
	return hasStringField(value, "message");
}

/** The user-facing sentence out of an error body, or `null` when unrecognised. */
export function readApiErrorMessage(payload: unknown): string | null {
	if (isApiErrorPayload(payload)) {
		return payload.error;
	}
	if (isLegacyMessageErrorPayload(payload)) {
		return payload.message;
	}
	return null;
}

/** The machine-readable `code` (`OVERLAP`, `NO_ORGANIZATION`, …), when present. */
export function readApiErrorCode(payload: unknown): string | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}
	const code = (payload as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}
