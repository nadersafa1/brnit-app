import type { ApiErrorBody } from "@brnit/api";
import { env } from "@brnit/env/server";
import { getLogger } from "@brnit/logger";
import type { NextFunction, Request, Response } from "express";

import {
	buildApiErrorBody,
	buildUnknownErrorBody,
	extractErrorCode,
	mapKnownErrorToHttpError,
} from "./error-format.js";

function resolveRequestLogger(req: Request) {
	return req.log ?? getLogger();
}

/**
 * Terminal Express error handler — registered last in `startup/setup-app.ts`.
 *
 * - Operational errors (`HttpError`, mapped SQLSTATE codes): stable message,
 *   optional `code`, optional `details`.
 * - Everything else: sanitized 500 in production; message + stack elsewhere.
 *
 * Assumes handlers call `next(err)` rather than sending a second response.
 */
export function errorMiddleware(
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	const log = resolveRequestLogger(req);

	if (res.headersSent) {
		log.error({ err }, "error after headers sent");
		next(err);
		return;
	}

	const isProduction = env.NODE_ENV === "production";
	const operational = mapKnownErrorToHttpError(err);

	if (operational) {
		log.warn(
			{ err, statusCode: operational.status, requestId: req.id },
			"operational error"
		);
		const body = buildApiErrorBody(
			operational.message,
			operational.causeDetail
		);
		const withCode: ApiErrorBody = body.code
			? body
			: { ...body, code: extractErrorCode(operational.causeDetail) };
		res.status(operational.status).json(withCode);
		return;
	}

	const logMessage =
		err instanceof Error ? err.message : "internal server error";
	log.error({ err, requestId: req.id }, logMessage);

	res.status(500).json(buildUnknownErrorBody(err, isProduction));
}
