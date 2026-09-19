import { Router } from "express";

import { VersionGateController } from "../controllers/version-gate.controller.js";
import {
	requireAdmin,
	requireSession,
} from "../middlewares/auth-middleware.js";

/**
 * The app version gate.
 *
 * `/app-version` carries **no guard at all**, deliberately. The native app asks
 * before it has a session — on a cold launch, and on the sign-in screen itself —
 * and a build old enough to be blocked may not be able to authenticate against
 * the current server anyway. Requiring a session would make the gate unable to
 * do the one thing it exists for. Nothing user-specific is returned, and the
 * blocking threshold is withheld from the response.
 *
 * `/admin/version-gate` is app-admin only. `requireAdmin` answers **401**, not
 * 403, for a signed-in non-admin — an existing client-visible contract, not an
 * oversight.
 */
export function createVersionGateRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const adminGuards = [requireSession(), requireAdmin()] as const;

	router.get("/app-version", VersionGateController.getAppVersion);

	router.get(
		"/admin/version-gate",
		...adminGuards,
		VersionGateController.getAdminVersionGate
	);
	router.put(
		"/admin/version-gate",
		...adminGuards,
		VersionGateController.putAdminVersionGate
	);

	return router;
}
