import { Router } from "express";

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
 * Three audiences share one controller:
 *
 * - `/admin/**` — full CRUD, app admins only.
 * - `/nutritionist/**` — the same reads, no writes.
 * - `/member/me/**` — the member app's reads plus the alternatives endpoint.
 *
 * Food data is global reference data rather than organization-scoped, so the
 * nutritionist and member routes need no org resolution.
 */
export function createFoodRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// module before this file finishes loading.
	const adminOnly = [requireSession(), requireAdmin()] as const;
	const nutritionistRead = [requireSession(), requireNutritionist()] as const;
	const memberRead = [requireSession()] as const;

	// ---- Admin: food categories -------------------------------------------
	router.get(
		"/admin/food-categories",
		...adminOnly,
		FoodController.listCategories
	);
	router.post(
		"/admin/food-categories",
		...adminOnly,
		FoodController.createCategory
	);
	router.get(
		"/admin/food-categories/:foodCategoryId",
		...adminOnly,
		FoodController.getCategory
	);
	router.patch(
		"/admin/food-categories/:foodCategoryId",
		...adminOnly,
		FoodController.updateCategory
	);
	router.delete(
		"/admin/food-categories/:foodCategoryId",
		...adminOnly,
		FoodController.deleteCategory
	);

	// ---- Admin: food items ------------------------------------------------
	// `handleImageUpload` runs after the guards: an unauthenticated request must
	// not get as far as buffering a 5 MB upload.
	router.get("/admin/food-items", ...adminOnly, FoodController.listItems);
	router.post(
		"/admin/food-items",
		...adminOnly,
		handleImageUpload,
		FoodController.createItem
	);
	router.get(
		"/admin/food-items/:foodItemId",
		...adminOnly,
		FoodController.getItem
	);
	router.patch(
		"/admin/food-items/:foodItemId",
		...adminOnly,
		handleImageUpload,
		FoodController.updateItem
	);
	router.delete(
		"/admin/food-items/:foodItemId",
		...adminOnly,
		FoodController.deleteItem
	);

	// ---- Nutritionist: read-only mirrors ----------------------------------
	router.get(
		"/nutritionist/food-categories",
		...nutritionistRead,
		FoodController.listCategories
	);
	router.get(
		"/nutritionist/food-categories/:foodCategoryId",
		...nutritionistRead,
		FoodController.getCategory
	);
	router.get(
		"/nutritionist/food-items",
		...nutritionistRead,
		FoodController.listItems
	);
	router.get(
		"/nutritionist/food-items/:foodItemId",
		...nutritionistRead,
		FoodController.getItem
	);

	// ---- Member -----------------------------------------------------------
	router.get(
		"/member/me/food-categories",
		...memberRead,
		FoodController.listMemberCategories
	);
	router.get(
		"/member/me/food-items",
		...memberRead,
		FoodController.listItems
	);
	router.get(
		"/member/me/food-items/:foodItemId/alternatives",
		...memberRead,
		FoodController.getItemAlternatives
	);

	return router;
}
