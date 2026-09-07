import { deleteDevicePushToken, registerDevicePushToken } from "@brnit/api";
import {
	deleteDevicePushTokenBodySchema,
	registerDevicePushTokenBodySchema,
} from "@brnit/push/schemas";
import type { NextFunction, Request, Response } from "express";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import { handleHandlerError, parseJsonBody } from "../utils/http.js";

/**
 * Device push-token registration for the native app.
 *
 * Both routes are scoped to the caller's own session. A token is a delivery
 * address, so an endpoint that let one user register or delete another's
 * would let an attacker either steal their notifications or silence them.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class DeviceTokenController {
	/**
	 * `POST /me/device-tokens`.
	 *
	 * Idempotent: the native client re-registers on every launch and on every
	 * FCM token refresh, so this upserts rather than erroring on a token it has
	 * already seen.
	 */
	static async register(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(req, res, registerDevicePushTokenBodySchema);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await registerDevicePushToken(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/**
	 * `DELETE /me/device-tokens`.
	 *
	 * Called on sign-out, while the session cookie is still valid — afterwards
	 * the caller can no longer prove the token is theirs, and the device would
	 * keep receiving the previous user's reminders.
	 *
	 * Answers 200 with `{ deleted: false }` rather than 404 when the token is
	 * already gone: sign-out must not fail because a cleanup already ran.
	 */
	static async delete(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const input = parseJsonBody(req, res, deleteDevicePushTokenBodySchema);
			if (input === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(await deleteDevicePushToken(ctx, input));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
