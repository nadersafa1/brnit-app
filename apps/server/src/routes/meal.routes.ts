import { type RequestHandler, Router } from "express";

import { MealController } from "../controllers/meal.controller.js";
import {
	requireAdmin,
	requireNutritionist,
	requireSession,
} from "../middlewares/auth-middleware.js";

/**
 * Meal routes.
 *
 * Meals are a **global catalog**, not organization data, so admins and
 * nutritionists get the identical surface — full CRUD plus clone. The paths are
 * registered twice under different guards while pointing at the same
 * controller: the behaviour is defined once, and the only difference between
 * the two trees is who may reach them.
 */
function registerMealRoutes(
	router: Router,
	basePath: string,
	guards: readonly RequestHandler[]
): void {
	router.get(basePath, ...guards, MealController.getList);
	router.post(basePath, ...guards, MealController.post);

	// Static segment first: `/meals/:id/clone` must be matched as the clone
	// action, never as an id that happens to be followed by a path segment.
	router.post(`${basePath}/:id/clone`, ...guards, MealController.postClone);

	router.get(`${basePath}/:id`, ...guards, MealController.getById);
	router.patch(`${basePath}/:id`, ...guards, MealController.patch);
	router.delete(`${basePath}/:id`, ...guards, MealController.delete);
}

export function createMealRouter(): Router {
	const router = Router();

	// Built inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const adminGuards = [requireSession(), requireAdmin()] as const;
	const nutritionistGuards = [requireSession(), requireNutritionist()] as const;

	registerMealRoutes(router, "/admin/meals", adminGuards);
	registerMealRoutes(router, "/nutritionist/meals", nutritionistGuards);

	return router;
}
