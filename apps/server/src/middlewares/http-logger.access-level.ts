import type { LevelWithSilent } from "pino";

/** Requests slower than this (ms) are logged at `warn` in access logs. */
export const SLOW_REQUEST_WARN_MS = 1000;

/** Session polling: every client re-checks this on focus, so it dominates volume. */
const GET_SESSION_PATH = "/api/auth/get-session";

/** Path without the query string — noisy-route matching ignores query params. */
export function requestPathname(originalUrl: string | undefined): string {
	if (!originalUrl) {
		return "";
	}
	const queryIndex = originalUrl.indexOf("?");
	return queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
}

/** High-volume, low-signal routes: downgraded to `debug` at the default level. */
export function isNoisyAccessPath(
	method: string,
	originalUrl: string | undefined
): boolean {
	if (method === "OPTIONS") {
		return true;
	}

	const path = requestPathname(originalUrl);
	if (path === "/" || path.endsWith("/health")) {
		return true;
	}

	return path === GET_SESSION_PATH;
}

/**
 * Resolves the pino level for one HTTP access log line.
 * 5xx and slow requests win over the noisy-route downgrade.
 */
export function resolveAccessLogLevel(
	method: string,
	originalUrl: string | undefined,
	statusCode: number,
	responseTimeMs: number | undefined,
	slowRequestWarnMs: number = SLOW_REQUEST_WARN_MS
): LevelWithSilent {
	if (statusCode >= 500) {
		return "warn";
	}

	if (responseTimeMs !== undefined && responseTimeMs >= slowRequestWarnMs) {
		return "warn";
	}

	if (isNoisyAccessPath(method, originalUrl)) {
		return "debug";
	}

	return "info";
}
