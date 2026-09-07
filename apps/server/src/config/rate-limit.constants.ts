/** Credential auth endpoints (per IP). Guards against password spraying. */
export const RATE_LIMIT_AUTH_MAX = 10;
export const RATE_LIMIT_AUTH_WINDOW_MINUTES = 15;

/** Stable machine-readable code returned on HTTP 429 from every limiter. */
export const RATE_LIMIT_ERROR_CODE = "RATE_LIMITED";

/**
 * Better Auth POST paths that accept credentials and need strict throttling.
 *
 * Mounted individually in `routes/auth.routes.ts` **before** the catch-all
 * handler, so the rest of the auth surface (OAuth callbacks, `get-session`,
 * organization plugin calls) stays unthrottled.
 */
export const CREDENTIAL_AUTH_POST_PATHS = [
	"/api/auth/sign-in/email",
	"/api/auth/sign-up/email",
	"/api/auth/forget-password",
	"/api/auth/request-password-reset",
	"/api/auth/reset-password",
] as const;
