import { env } from "@brnit/env/server";
import {
	type App,
	cert,
	getApps,
	initializeApp,
	type ServiceAccount,
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let cachedMessaging: Messaging | undefined;

/**
 * Accepts the service account either as raw JSON or base64.
 *
 * Compose and most secret stores pass env vars through a line-oriented `.env`
 * parser, which mangles the embedded newlines in the PEM private key — so the
 * base64 form is the one production actually uses. Raw JSON stays supported
 * because it is what a developer pastes locally.
 */
function parseServiceAccountJson(raw: string): ServiceAccount {
	const trimmed = raw.trim();
	const jsonText = trimmed.startsWith("{")
		? trimmed
		: Buffer.from(trimmed, "base64").toString("utf8");
	const parsed: unknown = JSON.parse(jsonText);
	if (!parsed || typeof parsed !== "object") {
		throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not a valid JSON object");
	}
	return parsed as ServiceAccount;
}

function getOrInitFirebaseApp(): App | null {
	if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
		return null;
	}

	const existing = getApps()[0];
	if (existing) {
		return existing;
	}

	const serviceAccount = parseServiceAccountJson(
		env.FIREBASE_SERVICE_ACCOUNT_JSON
	);
	return initializeApp({
		credential: cert(serviceAccount),
		projectId: env.FIREBASE_PROJECT_ID ?? serviceAccount.projectId,
	});
}

/**
 * Firebase Messaging when credentials are configured, `null` otherwise.
 *
 * Returning `null` rather than throwing is deliberate: push is optional
 * infrastructure, and every brnit environment except production runs without
 * Firebase credentials. A throwing accessor would take the API process down at
 * the first notification instead of degrading to "no push".
 *
 * Initialization is lazy and memoized, so an unconfigured process never pays
 * for the SDK and a configured one parses the service account exactly once.
 */
export function getFirebaseMessaging(): Messaging | null {
	if (cachedMessaging) {
		return cachedMessaging;
	}

	const app = getOrInitFirebaseApp();
	if (!app) {
		return null;
	}

	cachedMessaging = getMessaging(app);
	return cachedMessaging;
}
