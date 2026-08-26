import {
	createDietPlanMealConsumptionInputSchema,
	createMemberDietPlanMealConsumption,
	createNutritionistDietPlanMealConsumption,
	deleteDietPlanMealConsumptionBySlotInputSchema,
	deleteMemberDietPlanMealConsumptionBySlot,
	deleteNutritionistDietPlanMealConsumption,
	dietPlanMealConsumptionIdParamsSchema,
	dietPlanMealConsumptionListQuerySchema,
	listMemberDietPlanMealConsumptions,
	listNutritionistDietPlanMealConsumptions,
	paginationQueryInput,
	queryParam,
} from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import {
	handleHandlerError,
	jsonApiError,
	parseJsonBody,
} from "../utils/http.js";

const HTTP_CREATED = 201;

function consumptionListInput(req: Request): unknown {
	return {
		...paginationQueryInput(req.query),
		consumedDateFrom: queryParam(req.query.consumedDateFrom),
		consumedDateTo: queryParam(req.query.consumedDateTo),
		dietPlanAssignmentId: queryParam(req.query.dietPlanAssignmentId),
		sortBy: queryParam(req.query.sortBy),
		sortOrder: queryParam(req.query.sortOrder),
	};
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class ConsumptionController {
	static async listForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: the handler narrows the visible assignments to the caller's
			// organization; this only validates the filters.
			const input = dietPlanMealConsumptionListQuerySchema.safeParse(
				consumptionListInput(req)
			);
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
			res.json(await listNutritionistDietPlanMealConsumptions(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async createForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(
				req,
				res,
				createDietPlanMealConsumptionInputSchema
			);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res
				.status(HTTP_CREATED)
				.json(await createNutritionistDietPlanMealConsumption(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async deleteForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = dietPlanMealConsumptionIdParamsSchema.safeParse({
				id: req.params.id,
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
			const ctx = contextFromExpressRequest(req);
			res.json(
				await deleteNutritionistDietPlanMealConsumption(ctx, params.data)
			);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async listForMember(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = dietPlanMealConsumptionListQuerySchema.safeParse(
				consumptionListInput(req)
			);
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
			res.json(await listMemberDietPlanMealConsumptions(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async createForMember(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: mark a meal eaten. Both date windows are enforced by the handler.
			const input = parseJsonBody(
				req,
				res,
				createDietPlanMealConsumptionInputSchema
			);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res
				.status(HTTP_CREATED)
				.json(await createMemberDietPlanMealConsumption(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** Unmark: the payload names the slot and the day, never a consumption id. */
	static async deleteForMemberBySlot(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(
				req,
				res,
				deleteDietPlanMealConsumptionBySlotInputSchema
			);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await deleteMemberDietPlanMealConsumptionBySlot(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
