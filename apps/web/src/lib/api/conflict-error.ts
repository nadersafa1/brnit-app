import { isApiRequestError } from "@/lib/api/api-request-error";

/**
 * `409 Conflict` is not a generic failure on this API — it is a *rule*: a food
 * category still in use, a meal inside an assigned plan, a plan that somebody
 * is already eating from. The server's message names the blocker, and the
 * screens render it as a standing notice rather than a toast that disappears
 * before it can be read (`design-system/pages/dashboard-tables.md` ->
 * Destructive actions).
 *
 * Reading it off the mutation's own `error` keeps the notice stateless: React
 * Query clears `error` on the next attempt, so the banner disappears exactly
 * when the conflict is retried.
 */
const HTTP_CONFLICT = 409;

/** The server's sentence for a 409, or `null` for every other failure. */
export function readConflictMessage(error: unknown): string | null {
	if (isApiRequestError(error) && error.status === HTTP_CONFLICT) {
		return error.message;
	}
	return null;
}

/** True when the error is a blocking-rule refusal rather than a transport or input failure. */
export function isConflictError(error: unknown): boolean {
	return readConflictMessage(error) !== null;
}
