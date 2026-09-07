import { auth } from "@brnit/auth";
import { toNodeHandler } from "better-auth/node";
import type { Express } from "express";

import { CREDENTIAL_AUTH_POST_PATHS } from "../config/rate-limit.constants.js";
import { authCredentialRateLimiter } from "../middlewares/rate-limit.middleware.js";

const authHandler = toNodeHandler(auth);

/**
 * Registers Better Auth on `/api/auth/*`, deliberately **unversioned** — the
 * cookies it issues are path-scoped, and the web and native clients already
 * hold sessions minted under `/api/auth`.
 *
 * Credential POST paths are registered first so they pick up the production
 * rate limiter; the catch-all serves everything else (OAuth, session, admin and
 * organization plugin endpoints, `openAPI()`).
 *
 * Called from `setupApp` **before** `express.json()`.
 */
export function registerAuthRoutes(app: Express): void {
	for (const path of CREDENTIAL_AUTH_POST_PATHS) {
		app.post(path, authCredentialRateLimiter, authHandler);
	}

	app.all("/api/auth/*", authHandler);
}
