import { env } from "@brnit/env/native";

import { authClient } from "@/lib/auth-client";

import {
	ApiError,
	type ApiErrorResponse,
	type ApiFetchOptions,
} from "./types";

const VERSIONED_API_PATH_REGEX = /^\/api\/v\d+\//;

function getBaseURL(): string {
	if (!env.EXPO_PUBLIC_SERVER_URL) {
		throw new Error("EXPO_PUBLIC_SERVER_URL is not set");
	}
	return env.EXPO_PUBLIC_SERVER_URL;
}

/**
 * Rewrites `/api/…` to `/api/v{EXPO_PUBLIC_API_VERSION}/…`.
 *
 * Every endpoint moved under `/api/v1` when the API left Next.js for the
 * standalone Express server, so callers keep writing unversioned paths and the
 * version is applied in exactly one place. better-auth is deliberately excluded:
 * it stays mounted at the unversioned `/api/auth/*`, and `authClient` builds
 * those URLs itself rather than going through `apiFetch`.
 */
function withVersionedApiPath(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	if (!normalizedPath.startsWith("/api/")) {
		return normalizedPath;
	}
	if (VERSIONED_API_PATH_REGEX.test(normalizedPath)) {
		return normalizedPath;
	}
	return normalizedPath.replace(
		"/api/",
		`/api/v${env.EXPO_PUBLIC_API_VERSION}/`
	);
}

/** Full API URL for multipart uploads and other non-`apiFetch` callers. */
export function buildApiUrl(path: string): string {
	return `${getBaseURL()}${withVersionedApiPath(path)}`;
}

function serializeBody(
	body: unknown,
	isFormData: boolean
): BodyInit | undefined {
	if (body === undefined) {
		return;
	}
	if (isFormData) {
		return body as FormData;
	}
	return JSON.stringify(body);
}

export async function apiFetch<TResponse>(
	path: string,
	{ method = "GET", body, headers, signal }: ApiFetchOptions = {}
): Promise<TResponse> {
	const baseUrl = getBaseURL();
	const isFormData =
		typeof FormData !== "undefined" && body instanceof FormData;

	// Native has no cookie jar, so the session cookie is read out of
	// SecureStore by `@better-auth/expo` and attached by hand. `credentials`
	// stays "omit" for the same reason — this differs from web on purpose.
	const cookie = authClient.getCookie();

	const response = await fetch(`${baseUrl}${withVersionedApiPath(path)}`, {
		method,
		body: serializeBody(body, isFormData),
		headers: {
			...(isFormData ? {} : { "Content-Type": "application/json" }),
			...(cookie ? { Cookie: cookie } : {}),
			...headers,
		},
		credentials: "omit",
		signal,
	});

	const json: ApiErrorResponse | TResponse | undefined = await response
		.json()
		.catch(() => undefined);

	if (!response.ok) {
		const responseBody = json as ApiErrorResponse | undefined;
		const errorMessage =
			responseBody?.error ||
			`Request failed with ${response.status} ${response.statusText}`;

		throw new ApiError(response.status, errorMessage, responseBody?.details);
	}

	return json as TResponse;
}
