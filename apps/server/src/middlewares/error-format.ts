import { type ApiErrorBody, HttpError } from "@brnit/api";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error";
const CONFLICT_MESSAGE = "Conflict";

/**
 * PostgreSQL `unique_violation`.
 *
 * brnit is on Drizzle + `pg`, not Prisma, so the reference repo's `P2002` /
 * `P2025` mapping does not apply — the driver surfaces raw five-character
 * SQLSTATE codes instead. Drizzle wraps driver failures in its own error and
 * hangs the `pg` error off `cause`, hence {@link findPostgresErrorCode}.
 */
export const PG_UNIQUE_VIOLATION = "23505";

/** SQLSTATE is always five characters, digits and uppercase letters only. */
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/** Depth limit for the `cause` walk, so a self-referencing cause cannot hang. */
const MAX_CAUSE_DEPTH = 8;

interface CauseDetailWithCode {
	code: string;
}

function isCauseDetailWithCode(value: unknown): value is CauseDetailWithCode {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		typeof value.code === "string"
	);
}

function readSqlStateCode(value: unknown): string | undefined {
	if (!isCauseDetailWithCode(value)) {
		return;
	}
	return SQLSTATE_PATTERN.test(value.code) ? value.code : undefined;
}

/**
 * Walks the `cause` chain looking for a PostgreSQL SQLSTATE code.
 *
 * Drizzle rethrows driver errors wrapped in its own query error, so the `pg`
 * `DatabaseError` (which carries `code`) is usually one or two links down.
 * Controllers use this directly when a specific constraint needs a bespoke
 * status — e.g. the meal-item override upsert maps `23505` to 400, not 409.
 */
export function findPostgresErrorCode(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
		if (current === null || current === undefined) {
			return;
		}
		const code = readSqlStateCode(current);
		if (code !== undefined) {
			return code;
		}
		current = (current as { cause?: unknown }).cause;
	}
	return;
}

/** Pull machine-readable `code` from `HttpError.causeDetail` shaped as `{ code: string }`. */
export function extractErrorCode(causeDetail: unknown): string | undefined {
	return isCauseDetailWithCode(causeDetail) ? causeDetail.code : undefined;
}

/** Builds the JSON error envelope shared by controllers and the error middleware. */
export function buildApiErrorBody(
	message: string,
	causeDetail?: unknown
): ApiErrorBody {
	const code = extractErrorCode(causeDetail);
	if (causeDetail === undefined) {
		return code === undefined ? { error: message } : { error: message, code };
	}
	return code === undefined
		? { error: message, details: causeDetail }
		: { error: message, code, details: causeDetail };
}

/**
 * Normalizes thrown values into operational `HttpError`s the client may see
 * verbatim. Returns `null` when the error is unknown and must be sanitized.
 */
export function mapKnownErrorToHttpError(error: unknown): HttpError | null {
	if (error instanceof HttpError) {
		return error;
	}
	if (findPostgresErrorCode(error) === PG_UNIQUE_VIOLATION) {
		return new HttpError(409, CONFLICT_MESSAGE);
	}
	return null;
}

/** Client-safe message for unknown (non-operational) errors. */
export function clientMessageForUnknownError(
	error: unknown,
	isProduction: boolean
): string {
	if (isProduction) {
		return INTERNAL_SERVER_ERROR_MESSAGE;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return INTERNAL_SERVER_ERROR_MESSAGE;
}

/** 500 body — generic in production, message + stack outside it. */
export function buildUnknownErrorBody(
	error: unknown,
	isProduction: boolean
): ApiErrorBody {
	const message = clientMessageForUnknownError(error, isProduction);
	const body: ApiErrorBody = { error: message };
	if (!isProduction && error instanceof Error && error.stack) {
		body.stack = error.stack;
	}
	return body;
}
