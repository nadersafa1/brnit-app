import { env } from "@brnit/env/web";

import {
	type FetchWithCredentialsOptions,
	fetchJsonWithCredentials,
} from "./fetch-with-credentials";

const VERSIONED_API_PATH_REGEX = /^\/api\/v\d+\//;

/**
 * `/api/admin/food-items` -> `/api/v1/admin/food-items`.
 *
 * Call sites keep writing the unversioned path the old Next.js routes used, so
 * a version bump is one env var rather than a sweep through every query module.
 * Paths that already carry a version are left alone, and so is
 * `/api/auth/**` — better-auth is mounted unversioned and the auth client
 * builds those URLs itself.
 */
export function withVersionedApiPath(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	if (
		!normalizedPath.startsWith("/api/") ||
		normalizedPath.startsWith("/api/auth/") ||
		VERSIONED_API_PATH_REGEX.test(normalizedPath)
	) {
		return normalizedPath;
	}
	return normalizedPath.replace("/api/", `/api/v${env.VITE_API_VERSION}/`);
}

/** Absolute URL on the Express API for an app-relative path. */
export function apiUrl(path: string): string {
	return `${env.VITE_SERVER_URL}${withVersionedApiPath(path)}`;
}

/** JSON request against the Express API. Every query and mutation goes through here. */
export function fetchApiJson<T>(
	path: string,
	options?: FetchWithCredentialsOptions
): Promise<T> {
	return fetchJsonWithCredentials<T>(apiUrl(path), options);
}
