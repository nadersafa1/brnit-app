const DEFAULT_POST_AUTH_PATH = "/dashboard";

/**
 * Accepts only same-site absolute paths.
 *
 * `?redirect=` is attacker-controllable, so anything that could leave this
 * origin is discarded: absolute URLs, protocol-relative `//evil.com`, and
 * backslash forms browsers normalise to a host. Everything else falls back to
 * the dashboard.
 */
export function sanitizeRedirectPath(value: unknown): string | undefined {
	if (typeof value !== "string" || value.length === 0) {
		return;
	}
	if (!value.startsWith("/")) {
		return;
	}
	if (value.startsWith("//") || value.startsWith("/\\")) {
		return;
	}
	return value;
}

/** Where to land after a successful sign-in. */
export function resolvePostAuthPath(redirect: unknown): string {
	return sanitizeRedirectPath(redirect) ?? DEFAULT_POST_AUTH_PATH;
}
