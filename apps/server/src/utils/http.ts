import { HttpError } from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError, type ZodError } from "zod";

import { buildApiErrorBody } from "../middlewares/error-format.js";

/** Sends the JSON error envelope shared with the terminal error middleware. */
export function jsonApiError(
	res: Response,
	status: number,
	message: string,
	details?: unknown
): void {
	res.status(status).json(buildApiErrorBody(message, details));
}

/**
 * For controller catch blocks: answer operational errors inline, forward
 * anything unknown to `errorMiddleware` via `next(err)`.
 */
export function handleHandlerError(
	err: unknown,
	res: Response,
	next: NextFunction
): void {
	if (err instanceof HttpError) {
		jsonApiError(res, err.status, err.message, err.causeDetail);
		return;
	}
	next(err);
}

/**
 * Parses `req.body` with a Zod schema, answering 400 with
 * `flattenError()` output in `details` — the shape brnit's clients already
 * expect (`{ formErrors, fieldErrors }`).
 */
export function parseJsonBody<T>(
	req: Request,
	res: Response,
	schema: {
		safeParse: (
			data: unknown
		) => { success: true; data: T } | { success: false; error: ZodError };
	}
): T | undefined {
	const parsed = schema.safeParse(req.body ?? {});
	if (!parsed.success) {
		jsonApiError(res, 400, "Invalid request body", flattenError(parsed.error));
		return;
	}
	return parsed.data;
}
