import type { SearchSchemaInput } from "@tanstack/react-router";

import { sanitizeRedirectPath } from "@/lib/post-auth-redirect";

export interface AuthSearch {
	/** Present when arriving from an invitation email. */
	invitationId?: string;
	/** Where to land after signing in. Sanitised to a same-site path. */
	redirect?: string;
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * `validateSearch` for the signed-out routes.
 *
 * Both values reach the app from a URL a stranger can craft, so `redirect` is
 * sanitised here — at the single point every auth route parses it — rather than
 * at each place it is read.
 *
 * The `SearchSchemaInput` marker keeps the navigation input separate from the
 * parsed output, so a plain `<Link to="/login">` needs no search object.
 */
export function parseAuthSearch(
	search: Record<string, unknown> & SearchSchemaInput
): AuthSearch {
	const redirect = sanitizeRedirectPath(search.redirect);
	const invitationId = optionalString(search.invitationId);
	return {
		...(redirect === undefined ? {} : { redirect }),
		...(invitationId === undefined ? {} : { invitationId }),
	};
}
