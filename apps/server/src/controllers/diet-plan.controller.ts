import {
	createDietPlan,
	createDietPlanInputSchema,
	deleteDietPlan,
	dietPlanParamsSchema,
	getDietPlan,
	listDietPlans,
	listDietPlansInputSchema,
	paginationQueryInput,
	queryParam,
	updateDietPlan,
	updateDietPlanBodySchema,
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
 * Express adapter for the diet-plan handlers, serving both the `/admin` and
 * `/nutritionist` mounts. Same reasoning as `meal.controller.ts`: the two
 * differ only in the guard in front of them.
 */

/** Validates `:id`; returns `undefined` when it already answered 400. */
function parseDietPlanIdParam(
	req: Request,
	res: Response
): string | undefined {
	const params = dietPlanParamsSchema.safeParse({
		dietPlanId: req.params.id,
	});
	if (!params.success) {
		jsonApiError(
			res,
			400,
			"Invalid route parameters",
			flattenError(params.error)
		);
		return;
	}
	return params.data.dietPlanId;
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class DietPlanController {
	static async getList(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = listDietPlansInputSchema.safeParse({
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
			res.json(await listDietPlans(ctx, input.data));
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
			const dietPlanId = parseDietPlanIdParam(req, res);
			if (dietPlanId === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json({ data: await getDietPlan(ctx, { dietPlanId }) });
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
			const input = parseJsonBody(req, res, createDietPlanInputSchema);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.status(201).json({ data: await createDietPlan(ctx, input) });
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
			const dietPlanId = parseDietPlanIdParam(req, res);
			if (dietPlanId === undefined) {
				return;
			}
			const body = parseJsonBody(req, res, updateDietPlanBodySchema);
			if (body === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			// Answers with the full plan (slots included) because the editor
			// re-renders from this response.
			res.json({ data: await updateDietPlan(ctx, { ...body, dietPlanId }) });
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
			const dietPlanId = parseDietPlanIdParam(req, res);
			if (dietPlanId === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json({ data: await deleteDietPlan(ctx, { dietPlanId }) });
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
