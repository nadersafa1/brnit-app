import {
	createFoodCategory,
	createFoodCategoryInputSchema,
	createFoodItem,
	createFoodItemInputSchema,
	deleteFoodCategory,
	deleteFoodItem,
	foodCategoryParamsSchema,
	foodItemAlternativesInputSchema,
	foodItemParamsSchema,
	getFoodCategory,
	getFoodItem,
	getFoodItemAlternatives,
	listAllFoodCategories,
	listFoodCategories,
	listFoodCategoriesInputSchema,
	listFoodItems,
	listFoodItemsInputSchema,
	paginationQueryInput,
	queryParam,
	updateFoodCategory,
	updateFoodCategoryByIdInputSchema,
	updateFoodItem,
	updateFoodItemByIdInputSchema,
} from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import { handleHandlerError, jsonApiError } from "../utils/http.js";

/**
 * Food categories, food items and the alternatives search.
 *
 * One method backs every audience for a given operation — the admin,
 * nutritionist and member routers mount the same reads behind different guards,
 * because they serve the same global reference data. The handlers in
 * `@brnit/api` re-assert authorization, so the guard choice in the router is
 * defense in depth rather than the only check.
 */

const INVALID_QUERY_MESSAGE = "Invalid query parameters";
const INVALID_BODY_MESSAGE = "Invalid request body";

/** Text fields multer parses out of the food-item multipart bodies. */
const FOOD_ITEM_SCALAR_FIELDS = [
	"name",
	"calories",
	"protein",
	"carbs",
	"fat",
	"unit",
	"gramsPerUnit",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Keeps only non-blank multipart values.
 *
 * A browser submits untouched inputs as empty strings, and the schemas coerce:
 * `""` would become `0` and quietly zero a macro on update. Dropping blanks
 * first is what makes "field omitted" and "field cleared" distinguishable.
 */
function foodItemScalarFields(body: unknown): Record<string, string> {
	const source = isRecord(body) ? body : {};
	const fields: Record<string, string> = {};
	for (const key of FOOD_ITEM_SCALAR_FIELDS) {
		const value = source[key];
		if (typeof value === "string" && value.trim() !== "") {
			fields[key] = value;
		}
	}
	return fields;
}

/** `categoryIds` is repeated once per selection, so multer yields a string or an array. */
function foodItemCategoryIds(body: unknown): string[] {
	const raw = isRecord(body) ? body.categoryIds : undefined;
	const values = Array.isArray(raw) ? raw : [raw];
	return values.filter(
		(value): value is string => typeof value === "string" && value.trim() !== ""
	);
}

function multipartString(body: unknown, key: string): string | undefined {
	const value = isRecord(body) ? body[key] : undefined;
	return typeof value === "string" ? value : undefined;
}

/**
 * The multipart image buffer, when one was actually sent.
 *
 * A zero-byte part counts as "no file", matching the pre-overhaul routes —
 * some clients append the file input whether or not the user picked anything.
 */
function uploadedImage(req: Request): { file?: Buffer } {
	const file = req.file;
	if (!file?.buffer || file.size === 0) {
		return {};
	}
	return { file: file.buffer };
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class FoodController {
	// -------------------------------------------------------------------
	// Food categories
	// -------------------------------------------------------------------

	static async listCategories(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = listFoodCategoriesInputSchema.safeParse({
				...paginationQueryInput(req.query),
				q: queryParam(req.query.q),
				sortBy: queryParam(req.query.sortBy),
				sortOrder: queryParam(req.query.sortOrder),
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					INVALID_QUERY_MESSAGE,
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await listFoodCategories(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** Flat, unpaginated list for the member app's filter sheet. */
	static async listMemberCategories(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const ctx = contextFromExpressRequest(req);
			res.json(await listAllFoodCategories(ctx));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async getCategory(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = foodCategoryParamsSchema.safeParse({
				foodCategoryId: req.params.foodCategoryId,
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await getFoodCategory(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async createCategory(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = createFoodCategoryInputSchema.safeParse(req.body ?? {});
			if (!input.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(input.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.status(201).json(await createFoodCategory(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async updateCategory(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = updateFoodCategoryByIdInputSchema.safeParse({
				...(isRecord(req.body) ? req.body : {}),
				foodCategoryId: req.params.foodCategoryId,
			});
			if (!input.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(input.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await updateFoodCategory(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async deleteCategory(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = foodCategoryParamsSchema.safeParse({
				foodCategoryId: req.params.foodCategoryId,
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await deleteFoodCategory(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	// -------------------------------------------------------------------
	// Food items
	// -------------------------------------------------------------------

	static async listItems(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = listFoodItemsInputSchema.safeParse({
				...paginationQueryInput(req.query),
				categoryId: queryParam(req.query.categoryId),
				q: queryParam(req.query.q),
				sortBy: queryParam(req.query.sortBy),
				sortOrder: queryParam(req.query.sortOrder),
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					INVALID_QUERY_MESSAGE,
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await listFoodItems(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async getItem(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = foodItemParamsSchema.safeParse({
				foodItemId: req.params.foodItemId,
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await getFoodItem(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** Multipart create: text fields plus an optional image, uploaded by the handler. */
	static async createItem(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = createFoodItemInputSchema.safeParse({
				...foodItemScalarFields(req.body),
				categoryIds: foodItemCategoryIds(req.body),
			});
			if (!input.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(input.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res
				.status(201)
				.json(
					await createFoodItem(ctx, { ...input.data, ...uploadedImage(req) })
				);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async updateItem(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// An empty `categoryIds` means "leave the links alone"; only a non-empty
			// selection replaces them.
			const categoryIds = foodItemCategoryIds(req.body);
			const input = updateFoodItemByIdInputSchema.safeParse({
				...foodItemScalarFields(req.body),
				...(categoryIds.length > 0 ? { categoryIds } : {}),
				clearImage: multipartString(req.body, "clearImage"),
				foodItemId: req.params.foodItemId,
			});
			if (!input.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(input.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(
				await updateFoodItem(ctx, { ...input.data, ...uploadedImage(req) })
			);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async deleteItem(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = foodItemParamsSchema.safeParse({
				foodItemId: req.params.foodItemId,
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await deleteFoodItem(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `quantity` is required — the reference macros are computed at that amount. */
	static async getItemAlternatives(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = foodItemAlternativesInputSchema.safeParse({
				foodItemId: req.params.foodItemId,
				page: queryParam(req.query.page),
				perPage: queryParam(req.query.perPage),
				quantity: queryParam(req.query.quantity),
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					INVALID_QUERY_MESSAGE,
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await getFoodItemAlternatives(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
