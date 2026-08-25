import { Router } from "express";

import { DeviceTokenController } from "../controllers/device-token.controller.js";
import { requireSession } from "../middlewares/auth-middleware.js";

/**
 * `/me/device-tokens` — push-token registration for the native app.
 *
 * Session-guarded only: any signed-in user may register their own device.
 * The handlers scope every read and write to `ctx.user.id`, so the guard is
 * about proving identity, not about role.
 */
export function createDeviceTokenRouter(): Router {
	const router = Router();

	router.post(
		"/me/device-tokens",
		requireSession(),
		DeviceTokenController.register
	);
	router.delete(
		"/me/device-tokens",
		requireSession(),
		DeviceTokenController.delete
	);

	return router;
}
