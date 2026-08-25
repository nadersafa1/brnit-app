import {
	assessmentParamsSchema,
	createAssessmentInputSchema,
	createBodyCompositionAssessment,
	deleteBodyCompositionAssessment,
	getBodyCompositionAssessment,
	getMemberAssessment,
	listAssessmentsInputSchema,
	listBodyCompositionAssessments,
	listMemberRecentAssessments,
	memberAssessmentInputSchema,
	memberRecentAssessmentsInputSchema,
	paginationQueryInput,
	queryParam,
	updateAssessmentInputSchema,
	updateBodyCompositionAssessment,
} from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError } from "zod";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import { handleHandlerError, jsonApiError } from "../utils/http.js";
import { parseMultipartFields } from "../utils/multipart-fields.js";

const INVALID_QUERY_MESSAGE = "Invalid query parameters";
const INVALID_BODY_MESSAGE = "Invalid request body";
const CREATED_STATUS = 201;

/** `req.params.id` is typed `string` by Express but absent on a bad mount. */
function routeParamId(req: Request): string | undefined {
	return typeof req.params.id === "string" ? req.params.id : undefined;
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class AssessmentController {
	/**
	 * `GET /direct-admin/body-composition-assessments` and its read-only
	 * nutritionist mirror. Both are scoped to the caller's active organization
	 * by the handler; only the route guard differs.
	 */
	static async list(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = listAssessmentsInputSchema.safeParse({
				...paginationQueryInput(req.query),
				memberId: queryParam(req.query.memberId),
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
			res.json(await listBodyCompositionAssessments(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `POST /direct-admin/body-composition-assessments` — multipart, 201. */
	static async post(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			// Section: multer has already parsed the form; text fields are strings.
			const fields = parseMultipartFields(
				req,
				res,
				createAssessmentInputSchema
			);
			if (fields === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			const result = await createBodyCompositionAssessment(ctx, {
				...fields,
				...(req.file?.buffer ? { file: req.file.buffer } : {}),
			});
			res.status(CREATED_STATUS).json(result);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `GET /direct-admin/body-composition-assessments/:id`. */
	static async getById(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = assessmentParamsSchema.safeParse({
				id: routeParamId(req),
			});
			if (!params.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(params.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await getBodyCompositionAssessment(ctx, params.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `PATCH /direct-admin/body-composition-assessments/:id` — multipart. */
	static async patch(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = assessmentParamsSchema.safeParse({
				id: routeParamId(req),
			});
			if (!params.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(params.error));
				return;
			}
			const fields = parseMultipartFields(
				req,
				res,
				updateAssessmentInputSchema
			);
			if (fields === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(
				await updateBodyCompositionAssessment(ctx, {
					...fields,
					id: params.data.id,
					...(req.file?.buffer ? { file: req.file.buffer } : {}),
				})
			);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `DELETE /direct-admin/body-composition-assessments/:id`. */
	static async delete(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const params = assessmentParamsSchema.safeParse({
				id: routeParamId(req),
			});
			if (!params.success) {
				jsonApiError(res, 400, INVALID_BODY_MESSAGE, flattenError(params.error));
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await deleteBodyCompositionAssessment(ctx, params.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `GET /member/me/body-composition-assessments/recent`. */
	static async listMemberRecent(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = memberRecentAssessmentsInputSchema.safeParse({
				limit: queryParam(req.query.limit),
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
			res.json(await listMemberRecentAssessments(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/**
	 * `GET /member/me/body-composition-assessments/:id`.
	 *
	 * `?orgId` is required — it is what resolves which `member` row the caller
	 * is, and therefore whether this assessment is theirs.
	 */
	static async getMemberById(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = memberAssessmentInputSchema.safeParse({
				id: routeParamId(req),
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
			res.json(await getMemberAssessment(ctx, input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
