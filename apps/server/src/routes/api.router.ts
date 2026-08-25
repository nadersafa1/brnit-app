import { Router } from "express";

import { HealthController } from "../controllers/health.controller.js";

/**
 * The `/api/v1` router. Mounted once by `startup/setup-app.ts`.
 *
 * Every feature area contributes a `create<Feature>Router()` factory from its
 * own `routes/<feature>.routes.ts`, mounted below. Guards and shared middleware
 * tuples are declared **inside** each factory, never here.
 */
export function createApiRouter(): Router {
	const api = Router();

	// Readiness probe lives on the versioned router so clients can reach it
	// through the same base URL as everything else.
	api.get("/health", HealthController.apiHealth);

	// ---------------------------------------------------------------------
	// Feature routers — added by the controllers/routes pass, not here.
	//
	//   admin         /admin/{food-categories,food-items,meals,diet-plans}
	//   nutritionist  /nutritionist/**  (read-only mirrors + assignments)
	//   direct-admin  /direct-admin/body-composition-assessments
	//   member        /member/me/**
	//   me            /me/profile
	//   users         /users/me/organization-context
	//   cloudinary    /cloudinary/sign
	//
	// e.g. `api.use(createAdminRouter());`
	// ---------------------------------------------------------------------

	return api;
}
