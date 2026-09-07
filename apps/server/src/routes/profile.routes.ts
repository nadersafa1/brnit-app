import { Router } from "express";

import { ProfileController } from "../controllers/profile.controller.js";
import { requireSession } from "../middlewares/auth-middleware.js";
import { handleImageUpload } from "../middlewares/image-upload.middleware.js";

/**
 * `/me/profile` — the signed-in user's own name, date of birth and avatar.
 *
 * PATCH is multipart because the avatar rides along with the text fields;
 * `handleImageUpload` parses it after the session guard has run.
 */
export function createProfileRouter(): Router {
	const router = Router();

	router.get("/me/profile", requireSession(), ProfileController.get);
	router.patch(
		"/me/profile",
		requireSession(),
		handleImageUpload,
		ProfileController.patch
	);

	return router;
}
