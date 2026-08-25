import { env } from "@brnit/env/server";
import { v2 as cloudinary } from "cloudinary";

import { HttpError } from "../http-error";

/**
 * Cloudinary client configuration for server-side uploads and destroys.
 *
 * Every credential is `.optional()` in `@brnit/env` so local dev boots without
 * an image account. That means "not configured" is a *runtime* condition, and
 * the failure has to be operational rather than a crash — hence `HttpError`
 * instead of a bare `Error`.
 */

interface CloudinaryCredentials {
	apiKey: string;
	apiSecret: string;
	cloudName: string;
}

const CLOUDINARY_NOT_CONFIGURED_MESSAGE = "Cloudinary is not configured";

/** Configuration happens once per process; the SDK keeps global state. */
let isCloudinaryConfigured = false;

/**
 * The cloud name alone, which is all a delivery URL needs.
 *
 * Kept separate from {@link ensureCloudinaryConfigured} on purpose: read paths
 * only render `imageUrl`s, so a deployment holding just the cloud name can
 * still serve every list and detail endpoint without an API key or secret.
 */
export function requireCloudinaryCloudName(): string {
	const cloudName = env.CLOUDINARY_CLOUD_NAME;
	if (!cloudName) {
		throw new HttpError(412, CLOUDINARY_NOT_CONFIGURED_MESSAGE);
	}
	return cloudName;
}

/**
 * Returns the full credential set and configures the shared SDK client once.
 * Required before any upload or destroy call.
 */
export function ensureCloudinaryConfigured(): CloudinaryCredentials {
	const cloudName = requireCloudinaryCloudName();
	const apiKey = env.CLOUDINARY_API_KEY;
	const apiSecret = env.CLOUDINARY_API_SECRET;

	if (!(apiKey && apiSecret)) {
		throw new HttpError(412, CLOUDINARY_NOT_CONFIGURED_MESSAGE);
	}

	if (!isCloudinaryConfigured) {
		cloudinary.config({
			api_key: apiKey,
			api_secret: apiSecret,
			cloud_name: cloudName,
		});
		isCloudinaryConfigured = true;
	}

	return { apiKey, apiSecret, cloudName };
}
