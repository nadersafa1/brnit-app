import type { Context } from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { flattenError, type ZodError } from "zod";

import { contextFromExpressRequest } from "./context-from-express-request.js";
import { handleHandlerError, jsonApiError } from "./http.js";

type SafeParseResult<T> =
	| { success: true; data: T }
	| { success: false; error: ZodError };

/**
 * Shared Express adapter for the common controller shape:
 * Zod parse → context → `@brnit/api` handler → `res.json`.
 *
 * Controllers that need a non-200 status, a side-effect dispatch or a custom
 * envelope should call the handler directly instead and finish with
 * `handleHandlerError`.
 */
export async function runHandler<TInput, TResult>(params: {
	buildInput: (req: Request) => SafeParseResult<TInput>;
	handler: (ctx: Context, input: TInput) => Promise<TResult>;
	next: NextFunction;
	req: Request;
	res: Response;
}): Promise<void> {
	const { buildInput, handler, req, res, next } = params;
	try {
		const parsed = buildInput(req);
		if (!parsed.success) {
			jsonApiError(res, 400, "Invalid request", flattenError(parsed.error));
			return;
		}
		const ctx = contextFromExpressRequest(req);
		res.json(await handler(ctx, parsed.data));
	} catch (err) {
		handleHandlerError(err, res, next);
	}
}
