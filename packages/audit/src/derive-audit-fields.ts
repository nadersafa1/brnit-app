import { AUDIT_FALLBACK_RESOURCE } from "./constants";

/**
 * Pure derivations for the request-level audit row. Deliberately free of
 * Express, Next.js and DB imports so both the HTTP adapter and the writer can
 * use them, and so they are unit-testable without mocks.
 *
 * Every function here is a byte-for-byte port of the pre-extraction behaviour
 * in `apps/web/src/lib/audit/audit-log-writer.ts`.
 */

/** Lowercase-keyed header bag. Structurally compatible with Node's `IncomingHttpHeaders`. */
export type AuditLogRequestHeaders = Readonly<
	Record<string, string | string[] | undefined>
>;

const WORD_SEPARATOR_PATTERN = /[_-]+/g;

/** Lets relative request targets (`/api/v1/x?orgId=1`) parse with the WHATWG URL parser. */
const RELATIVE_URL_BASE = "http://audit.invalid";

const MIN_PATH_SEGMENTS_FOR_RESOURCE = 2;

function firstHeaderValue(
	headers: AuditLogRequestHeaders,
	name: string
): string | null {
	const raw = headers[name];
	const value = Array.isArray(raw) ? raw[0] : raw;
	const trimmed = value?.trim() ?? "";
	return trimmed || null;
}

/** First IP in `x-forwarded-for` (proxies append), else `x-real-ip`. */
export function extractClientIp(
	headers: AuditLogRequestHeaders
): string | null {
	const forwardedFor = firstHeaderValue(headers, "x-forwarded-for");
	if (forwardedFor) {
		const first = forwardedFor.split(",")[0]?.trim();
		if (first) {
			return first;
		}
	}
	return firstHeaderValue(headers, "x-real-ip");
}

export function extractUserAgent(
	headers: AuditLogRequestHeaders
): string | null {
	return firstHeaderValue(headers, "user-agent");
}

function titleCase(input: string): string {
	return input
		.replaceAll(WORD_SEPARATOR_PATTERN, " ")
		.split(" ")
		.filter((word) => word.length > 0)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}

/**
 * The first path segment after `/api/`, TitleCased.
 *
 * `/api/member/me/food-items/[id]/alternatives` → `"Member"`.
 *
 * ⚠️ **No API-version stripping.** The original's comment claimed "(after
 * stripping optional version)" but the code never did, and this port keeps the
 * code's behaviour. Under the new `/api/v1` mount every row would therefore
 * read `resource: "V1"`, so callers must pass an `endpoint` with the version
 * prefix removed (or the team must decide to add stripping here deliberately).
 */
export function deriveResource(endpointPathname: string): string | null {
	const parts = endpointPathname.split("/").filter((part) => part.length > 0);
	if (parts.length < MIN_PATH_SEGMENTS_FOR_RESOURCE) {
		return null;
	}

	const afterApi = parts[0] === "api" ? parts[1] : parts[0];
	return afterApi ? titleCase(afterApi) : null;
}

function deriveActionVerb(method: string): string {
	switch (method) {
		case "GET":
			return "Get";
		case "POST":
			return "Create";
		case "PUT":
		case "PATCH":
			return "Update";
		case "DELETE":
			return "Delete";
		default:
			return method;
	}
}

/**
 * `Get|Create|Update|Delete` + the derived resource, e.g. `"CreateAdmin"`.
 *
 * Uses the resource segment rather than the raw path so dynamic ids never leak
 * into the label while it stays human-readable.
 */
export function deriveActionName(
	method: string,
	endpointPathname: string
): string {
	const verb = deriveActionVerb(method);
	const resource = deriveResource(endpointPathname) ?? AUDIT_FALLBACK_RESOURCE;
	return `${verb}${resource}`;
}

/** Pathname with the query string stripped — audit rows never store query values. */
export function deriveEndpointPath(url: string): string {
	try {
		return new URL(url, RELATIVE_URL_BASE).pathname;
	} catch {
		return url.split("?")[0] || url;
	}
}

/**
 * Organization id for the row, read **only** from the `?orgId=` query param.
 *
 * This is a preserved quirk: the session's active organization is not consulted,
 * so requests that rely on the implicit active org record a null organization.
 */
export function deriveOrganizationIdFromUrl(url: string): string | null {
	try {
		const orgId = new URL(url, RELATIVE_URL_BASE).searchParams.get("orgId");
		const cleaned = orgId?.trim() ?? "";
		return cleaned || null;
	} catch {
		return null;
	}
}
