import { Router } from "express";

import { UsersController } from "../controllers/users.controller.js";

/**
 * `/users/me/**`.
 *
 * `organization-context` is mounted **without a session guard** on purpose: it
 * answers 200 with the anonymous shape for a signed-out caller, because both
 * clients ask for it before they know whether a session exists.
 */
export function createUsersRouter(): Router {
	const router = Router();

	router.get(
		"/users/me/organization-context",
		UsersController.getOrganizationContext
	);

	return router;
}
