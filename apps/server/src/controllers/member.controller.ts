import { queryParam } from "@brnit/api";
import {
	getConsumptionStreak,
	getCurrentDietPlan,
	getOrganizationLeaderboard,
} from "@brnit/api/handlers/member";
import {
	currentDietPlanQuerySchema,
	organizationLeaderboardQuerySchema,
} from "@brnit/api/member/schemas";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import { handleHandlerError, jsonApiError } from "../utils/http.js";

const INVALID_QUERY_MESSAGE = "Invalid query parameters";

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class MemberController {
	/** `GET /member/me/current-diet-plan` — the member Home read. */
	static async getCurrentDietPlan(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: validate the optional date window, then delegate.
			const input = currentDietPlanQuerySchema.safeParse({
				from: queryParam(req.query.from),
				to: queryParam(req.query.to),
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
			res.json(await getCurrentDietPlan(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `GET /member/me/consumption-streak` — no input beyond the session. */
	static async getConsumptionStreak(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const ctx = contextFromExpressRequest(req);
			res.json(await getConsumptionStreak(ctx));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `GET /member/me/organization-leaderboard` — top three plus self. */
	static async getOrganizationLeaderboard(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = organizationLeaderboardQuerySchema.safeParse({
				orgId: queryParam(req.query.orgId),
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
			res.json(await getOrganizationLeaderboard(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
