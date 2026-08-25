import { type RequestHandler, Router } from "express";

import { FoodController } from "../controllers/food.controller.js";
import {
	requireAdmin,
	requireNutritionist,
	requireSession,
} from "../middlewares/auth-middleware.js";
import { handleImageUpload } from "../middlewares/image-upload.middleware.js";

/**
 * Food categories, food items and the member alternatives search.
 *
 * Food is a **global catalog**, not organization data, so none of these routes
 * resolve an organization. What differs between the three trees is only who may
 * reach them and how much they may do:
 *
 * - `/admin/**` — the reads plus full CRUD.
 * - `/nutritionist/**` — exactly the admin reads, and nothing else.
 * - `/member/me/**` — the member app's reads plus the alternatives endpoint.
 */
function registerFoodReadRoutes(
	router: Router,
	basePath: string,
	guards: readonly RequestHandler[]
): void {
	router.get(
		`${basePath}/food-categories`,
		...guards,
		FoodController.listCategories
	);
	router.get(
		`${basePath}/food-categories/:foodCategoryId`,
		...guards,
		FoodController.getCategory
	);
	router.get(`${basePath}/food-items`, ...guards, FoodController.listItems);
	router.get(
		`${basePath}/food-items/:foodItemId`,
		...guards,
		FoodController.getItem
	);
}

function registerFoodWriteRoutes(
	router: Router,
	basePath: string,
	guards: readonly RequestHandler[]
): void {
	router.post(
		`${basePath}/food-categories`,
		...guards,
		FoodController.createCategory
	);
	router.patch(
		`${basePath}/food-categories/:foodCategoryId`,
		...guards,
		FoodController.updateCategory
	);
	router.delete(
		`${basePath}/food-categories/:foodCategoryId`,
		...guards,
		FoodController.deleteCategory
	);

	// `handleImageUpload` runs after the guards: an unauthenticated request must
	// not get as far as buffering a 5 MB upload.
	router.post(
		`${basePath}/food-items`,
		...guards,
		handleImageUpload,
		FoodController.createItem
	);
	router.patch(
		`${basePath}/food-items/:foodItemId`,
		...guards,
		handleImageUpload,
		FoodController.updateItem
	);
	router.delete(
		`${basePath}/food-items/:foodItemId`,
		...guards,
		FoodController.deleteItem
	);
}

export function createFoodRouter(): Router {
	const router = Router();

	// Built inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const adminGuards = [requireSession(), requireAdmin()] as const;
	const nutritionistGuards = [requireSession(), requireNutritionist()] as const;
	const memberGuards = [requireSession()] as const;

	registerFoodReadRoutes(router, "/admin", adminGuards);
	registerFoodWriteRoutes(router, "/admin", adminGuards);
	registerFoodReadRoutes(router, "/nutritionist", nutritionistGuards);

	// The member tree is not a mirror of the other two: categories come back
	// flat and unpaginated for the filter sheet, and only members get
	// alternatives.
	router.get(
		"/member/me/food-categories",
		...memberGuards,
		FoodController.listMemberCategories
	);
	router.get(
		"/member/me/food-items",
		...memberGuards,
		FoodController.listItems
	);
	router.get(
		"/member/me/food-items/:foodItemId/alternatives",
		...memberGuards,
		FoodController.getItemAlternatives
	);

	return router;
}
