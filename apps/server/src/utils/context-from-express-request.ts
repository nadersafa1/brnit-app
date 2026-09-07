import type { Context } from "@brnit/api";
import { createContextFromRequest } from "@brnit/api";
import type { Request } from "express";

/**
 * Builds handler context from an Express request.
 *
 * The auth middleware has already resolved the session and any organization
 * scope onto `req.auth`, so this re-fetches nothing — a controller mounted
 * without the guards simply gets an anonymous context.
 *
 * The context shape itself lives in `@brnit/api` so handlers can be called from
 * somewhere other than Express (a worker, a test) without dragging in the
 * Express types.
 */
export function contextFromExpressRequest(req: Request): Context {
	return createContextFromRequest({
		auth: req.auth,
		headers: req.headers,
	});
}
