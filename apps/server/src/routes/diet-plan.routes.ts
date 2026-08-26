import { type RequestHandler, Router } from "express";

import { DietPlanController } from "../controllers/diet-plan.controller.js";
import {
	requireAdmin,
	requireNutritionist,
	requireSession,
} from "../middlewares/auth-middleware.js";

/**
 * Diet-plan routes.
 *
 * Like meals, diet plans are a global catalog: the admin and nutritionist trees
 * expose the same full CRUD against the same controller, and differ only in the
 * guard in front. Assignments — which *are* organization-scoped — live in their
 * own router.
 */
function registerDietPlanRoutes(
	router: Router,
	basePath: string,
	guards: readonly RequestHandler[]
): void {
	router.get(basePath, ...guards, DietPlanController.getList);
	router.post(basePath, ...guards, DietPlanController.post);
	router.get(`${basePath}/:id`, ...guards, DietPlanController.getById);
	router.patch(`${basePath}/:id`, ...guards, DietPlanController.patch);
	router.delete(`${basePath}/:id`, ...guards, DietPlanController.delete);
}

export function createDietPlanRouter(): Router {
	const router = Router();

	// Built inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const adminGuards = [requireSession(), requireAdmin()] as const;
	const nutritionistGuards = [requireSession(), requireNutritionist()] as const;

	registerDietPlanRoutes(router, "/admin/diet-plans", adminGuards);
	registerDietPlanRoutes(
		router,
		"/nutritionist/diet-plans",
		nutritionistGuards
	);

	return router;
}
