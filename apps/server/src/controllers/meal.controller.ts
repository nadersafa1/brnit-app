import {
	cloneMeal,
	createMeal,
	createMealInputSchema,
	deleteMeal,
	getMeal,
	listMeals,
	listMealsInputSchema,
	mealParamsSchema,
	paginationQueryInput,
	queryParam,
	updateMeal,
	updateMealBodySchema,
} from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import {
	handleHandlerError,
	jsonApiError,
	parseJsonBody,
} from "../utils/http.js";

/**
 * Express adapter for the meal handlers.
 *
 * One controller serves both mounts — `/admin/meals` and `/nutritionist/meals`
 * differ only in the guard the router puts in front, never in behaviour, so
 * the parsing and the response envelopes live here once.
 */

/**
 * Validates `:id` and answers 400 itself when it is missing.
 *
 * Returns `undefined` to mean "response already sent", matching
 * `parseJsonBody`.
 */
function parseMealIdParam(req: Request, res: Response): string | undefined {
	const params = mealParamsSchema.safeParse({ mealId: req.params.id });
	if (!params.success) {
		jsonApiError(
			res,
			400,
			"Invalid route parameters",
			flattenError(params.error)
		);
		return;
	}
	return params.data.mealId;
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class MealController {
	static async getList(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = listMealsInputSchema.safeParse({
				...paginationQueryInput(req.query),
				q: queryParam(req.query.q),
				sortBy: queryParam(req.query.sortBy),
				sortOrder: queryParam(req.query.sortOrder),
			});
			if (!input.success) {
				jsonApiError(
					res,
					400,
					"Invalid query parameters",
					flattenError(input.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			// The handler already returns the `{ data, pagination }` envelope.
			res.json(await listMeals(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async getById(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const mealId = parseMealIdParam(req, res);
			if (mealId === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json({ data: await getMeal(ctx, { mealId }) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async post(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(req, res, createMealInputSchema);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.status(201).json({ data: await createMeal(ctx, input) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async postClone(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const mealId = parseMealIdParam(req, res);
			if (mealId === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.status(201).json({ data: await cloneMeal(ctx, { mealId }) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async patch(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const mealId = parseMealIdParam(req, res);
			if (mealId === undefined) {
				return;
			}
			const body = parseJsonBody(req, res, updateMealBodySchema);
			if (body === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json({ data: await updateMeal(ctx, { ...body, mealId }) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async delete(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const mealId = parseMealIdParam(req, res);
			if (mealId === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			// DELETE answers 200 with the deleted entity so the client can update
			// its cache without a follow-up read.
			res.json({ data: await deleteMeal(ctx, { mealId }) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
