import {
	adminVersionGatePutBodySchema,
	appVersionQuerySchema,
	getAdminVersionGate,
	getAppVersion,
	putAdminVersionGate,
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

/**
 * The native app's version gate: one public read, and the admin pair that
 * configures it.
 *
 * The public read builds no context and takes no session — see the router.
 * The admin methods do build one, and the handlers in `@brnit/api` re-assert
 * the `admin` role, so the guard in the router is defense in depth.
 */

const INVALID_QUERY_MESSAGE = "Invalid query parameters";

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class VersionGateController {
	/**
	 * `GET /app-version?platform=…&version=…` — public.
	 *
	 * Returns the resolved action, never the thresholds; the client does not
	 * compare versions. An unconfigured platform answers 200 with `none`, not
	 * 404: "no gate" is a valid state, and a client that treated an error as a
	 * block would strand every user the first time the endpoint hiccupped.
	 */
	static async getAppVersion(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = appVersionQuerySchema.safeParse({
				platform: queryParam(req.query.platform),
				version: queryParam(req.query.version),
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
			res.json(await getAppVersion(input.data));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/** `GET /admin/version-gate` — both platforms; `null` where none is set. */
	static async getAdminVersionGate(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const ctx = contextFromExpressRequest(req);
			res.json(await getAdminVersionGate(ctx));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/**
	 * `PUT /admin/version-gate` — upserts the platforms present in the body and
	 * answers with the gate as it now stands. An omitted platform is untouched.
	 */
	static async putAdminVersionGate(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(req, res, adminVersionGatePutBodySchema);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await putAdminVersionGate(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
