import {
	createDietPlanAssignmentNutritionistInputSchema,
	createNutritionistDietPlanAssignment,
	deleteMemberMealItemOverride,
	deleteNutritionistDietPlanAssignment,
	dietPlanAssignmentIdParamsSchema,
	dietPlanAssignmentListQuerySchema,
	getNutritionistDietPlanAssignment,
	listMemberDietPlanAssignments,
	listMemberMealItemAlternatives,
	listNutritionistDietPlanAssignments,
	mealItemAlternativesQuerySchema,
	mealItemOverrideDateQuerySchema,
	mealItemOverrideParamsSchema,
	paginationQueryInput,
	queryParam,
	setMealItemOverrideBodySchema,
	setMemberMealItemOverride,
	updateDietPlanAssignmentBodySchema,
	updateNutritionistDietPlanAssignment,
} from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { emitPlanChangedForAssignmentBestEffort } from "../jobs/realtime-plan-emit.js";
import {
	findPostgresErrorCode,
	PG_UNIQUE_VIOLATION,
} from "../middlewares/error-format.js";
import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import {
	handleHandlerError,
	jsonApiError,
	parseJsonBody,
} from "../utils/http.js";

const HTTP_CREATED = 201;
const HTTP_OK = 200;

/**
 * The unique index on `(assignment, meal, meal_item, food_item)` is a *client*
 * error here — two swaps racing on the same slot — so it answers 400, not the
 * 409 the terminal error middleware gives every other unique violation.
 */
const OVERRIDE_CONFLICT_MESSAGE =
	"Override conflicts with an existing item override";

function assignmentListInput(req: Request): unknown {
	return {
		...paginationQueryInput(req.query),
		dietPlanId: queryParam(req.query.dietPlanId),
		memberId: queryParam(req.query.memberId),
		q: queryParam(req.query.q),
		sortBy: queryParam(req.query.sortBy),
		sortOrder: queryParam(req.query.sortOrder),
		userId: queryParam(req.query.userId),
	};
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class AssignmentController {
	static async listForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: parse list query; the organization scope comes from the context.
			const input = dietPlanAssignmentListQuerySchema.safeParse(
				assignmentListInput(req)
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
			res.json(await listNutritionistDietPlanAssignments(ctx, input.data));
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
			// Section: create an assignment for a member of the active organization.
			const input = parseJsonBody(
				req,
				res,
				createDietPlanAssignmentNutritionistInputSchema
			);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			const created = await createNutritionistDietPlanAssignment(ctx, input);
			res.status(HTTP_CREATED).json(created);

			// Staff write, response already sent: tell the assignee their Home
			// screen has a plan it does not know about. The DTO carries both
			// assignee columns, so the dispatcher needs no lookup of its own.
			emitPlanChangedForAssignmentBestEffort({
				dietPlanAssignmentId: created.data.id,
				memberId: created.data.memberId,
				reason: "assignment_changed",
				userId: created.data.userId,
			});
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async getForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = dietPlanAssignmentIdParamsSchema.safeParse({
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
			res.json(await getNutritionistDietPlanAssignment(ctx, params.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async updateForNutritionist(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: merge route id with the patch body before delegating.
			const params = dietPlanAssignmentIdParamsSchema.safeParse({
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
			const body = parseJsonBody(req, res, updateDietPlanAssignmentBodySchema);
			if (body === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			const updated = await updateNutritionistDietPlanAssignment(ctx, {
				...body,
				...params.data,
			});
			res.json(updated);

			// The window and/or the meal times moved. No `dateYmd`: an edited range
			// invalidates every day the member can currently see, not one of them.
			emitPlanChangedForAssignmentBestEffort({
				dietPlanAssignmentId: updated.data.id,
				memberId: updated.data.memberId,
				reason: "assignment_changed",
				userId: updated.data.userId,
			});
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
			const params = dietPlanAssignmentIdParamsSchema.safeParse({
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
			const deleted = await deleteNutritionistDietPlanAssignment(
				ctx,
				params.data
			);
			res.json(deleted);

			// The assignment row is gone, so the dispatcher cannot look its assignee
			// up any more — the deleted DTO's own assignee columns are the only
			// remaining source, and `member` is untouched by the delete.
			emitPlanChangedForAssignmentBestEffort({
				dietPlanAssignmentId: deleted.data.id,
				memberId: deleted.data.memberId,
				reason: "assignment_changed",
				userId: deleted.data.userId,
			});
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
			const ctx = contextFromExpressRequest(req);
			res.json(await listMemberDietPlanAssignments(ctx));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** PUT and PATCH share one implementation; the clients use PUT. */
	static async setMealItemOverride(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: route params and body are validated separately so the body
			// keeps the `.strict()` rejection of retired payload shapes.
			const params = mealItemOverrideParamsSchema.safeParse(req.params);
			if (!params.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(params.error)
				);
				return;
			}
			const body = parseJsonBody(req, res, setMealItemOverrideBodySchema);
			if (body === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			const result = await setMemberMealItemOverride(ctx, {
				...body,
				...params.data,
			});
			res
				.status(result.created ? HTTP_CREATED : HTTP_OK)
				.json({ data: result.data });

			// A swap is written by the member, so the assignee is the caller and no
			// lookup is needed — `setMemberMealItemOverride` has already asserted
			// the assignment is theirs. The emit is for their *other* sessions
			// (native and web on one account); the originating client updated
			// itself. `single_day` is the only scope narrow enough for `dateYmd`.
			emitPlanChangedForAssignmentBestEffort({
				...(body.scope === "single_day" ? { dateYmd: body.startDate } : {}),
				dietPlanAssignmentId: result.data.dietPlanAssignmentId,
				reason: "meal_time_changed",
				userId: ctx.user?.id,
			});
		} catch (err) {
			if (findPostgresErrorCode(err) === PG_UNIQUE_VIOLATION) {
				jsonApiError(res, 400, OVERRIDE_CONFLICT_MESSAGE);
				return;
			}
			handleHandlerError(err, res, next);
		}
	}

	/**
	 * Alternatives for the food a slot currently shows. No `quantity` parameter:
	 * the handler resolves it from the plan and any override covering the date.
	 */
	static async listMealItemAlternatives(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = mealItemOverrideParamsSchema.safeParse(req.params);
			if (!params.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(params.error)
				);
				return;
			}
			const query = mealItemAlternativesQuerySchema.safeParse({
				date: queryParam(req.query.date),
				page: queryParam(req.query.page),
				perPage: queryParam(req.query.perPage),
			});
			if (!query.success) {
				jsonApiError(
					res,
					400,
					"Invalid query parameters",
					flattenError(query.error)
				);
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(
				await listMemberMealItemAlternatives(ctx, {
					...query.data,
					...params.data,
				})
			);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	static async deleteMealItemOverride(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = mealItemOverrideParamsSchema.safeParse(req.params);
			if (!params.success) {
				jsonApiError(
					res,
					400,
					"Invalid route parameters",
					flattenError(params.error)
				);
				return;
			}

			// Section: `?date=` narrows the delete to one day; blank means "all days".
			const rawDate = queryParam(req.query.date)?.trim();
			let date: string | undefined;
			if (rawDate) {
				const parsed = mealItemOverrideDateQuerySchema.safeParse(rawDate);
				if (!parsed.success) {
					jsonApiError(
						res,
						400,
						"Invalid date query parameter",
						flattenError(parsed.error)
					);
					return;
				}
				date = parsed.data;
			}

			const ctx = contextFromExpressRequest(req);
			res.json(
				await deleteMemberMealItemOverride(ctx, { ...params.data, date })
			);

			// Same shape as the write: the caller owns the assignment, so pass the
			// assignee straight through. `?date=` is what makes the clear
			// day-scoped; without it the whole slot went back to the plan's food.
			emitPlanChangedForAssignmentBestEffort({
				...(date ? { dateYmd: date } : {}),
				dietPlanAssignmentId: params.data.assignmentId,
				reason: "meal_time_changed",
				userId: ctx.user?.id,
			});
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
