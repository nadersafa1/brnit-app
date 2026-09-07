import { Router } from "express";

import { HealthController } from "../controllers/health.controller.js";
import { createAssessmentRouter } from "./assessment.routes.js";
import { createAssignmentRouter } from "./assignment.routes.js";
import { createConsumptionRouter } from "./consumption.routes.js";
import { createDeviceTokenRouter } from "./device-token.routes.js";
import { createDietPlanRouter } from "./diet-plan.routes.js";
import { createFoodRouter } from "./food.routes.js";
import { createMealRouter } from "./meal.routes.js";
import { createMemberRouter } from "./member.routes.js";
import { createProfileRouter } from "./profile.routes.js";
import { createUsersRouter } from "./users.routes.js";

/**
 * The `/api/v1` router. Mounted once by `startup/setup-app.ts`.
 *
 * Each feature area contributes a `create<Feature>Router()` factory that
 * declares its own full paths — including the `/admin`, `/nutritionist`,
 * `/direct-admin` and `/member/me` prefixes — so this file adds no prefix of
 * its own. Guards and shared middleware tuples live inside each factory.
 *
 * Several factories mount the same handlers under more than one prefix (the
 * admin and nutritionist trees share an implementation), which is why there is
 * no one-router-per-URL-segment correspondence here.
 */
export function createApiRouter(): Router {
	const api = Router();

	// Readiness probe lives on the versioned router so clients reach it through
	// the same base URL as everything else. Liveness is separate, at `/`.
	api.get("/health", HealthController.apiHealth);

	// Catalogue: /admin/** and /nutritionist/** (reads shared, writes admin-only
	// for food; full CRUD for both on meals and diet plans).
	api.use(createFoodRouter());
	api.use(createMealRouter());
	api.use(createDietPlanRouter());

	// Assignments, overrides and consumption logging: /nutritionist/** and
	// /member/me/**.
	api.use(createAssignmentRouter());
	api.use(createConsumptionRouter());

	// Body composition: /direct-admin/**, /nutritionist/** and /member/me/**.
	api.use(createAssessmentRouter());

	// Member reads: current diet plan, streak, leaderboard.
	api.use(createMemberRouter());

	// Identity: /me/profile and /users/me/organization-context.
	api.use(createProfileRouter());
	api.use(createUsersRouter());

	// Push delivery addresses for the native app: /me/device-tokens.
	api.use(createDeviceTokenRouter());

	// Note: the old `/api/cloudinary/sign` signed-direct-upload endpoint is
	// deliberately not ported. Every entity path uploads server-side through
	// `@brnit/api/cloudinary/assets`, and the only caller of the sign route was
	// `apps/web/src/hooks/use-cloudinary-upload.ts`, which nothing imported.

	return api;
}
