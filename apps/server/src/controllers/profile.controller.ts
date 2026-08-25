import { getProfile, updateProfile } from "@brnit/api/handlers/profile";
import { updateProfileInputSchema } from "@brnit/api/profile/schemas";
import type { NextFunction, Request, Response } from "express";

import { contextFromExpressRequest } from "../utils/context-from-express-request.js";
import { handleHandlerError } from "../utils/http.js";
import { parseMultipartFields } from "../utils/multipart-fields.js";

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class ProfileController {
	/** `GET /me/profile` — reads straight off the session user. */
	static get(req: Request, res: Response, next: NextFunction): void {
		try {
			const ctx = contextFromExpressRequest(req);
			res.json(getProfile(ctx));
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}

	/**
	 * `PATCH /me/profile` — multipart `name`, `dob`, `clearImage` and an
	 * optional `file`. Size and MIME limits are enforced upstream by
	 * `handleImageUpload`.
	 */
	static async patch(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const fields = parseMultipartFields(req, res, updateProfileInputSchema);
			if (fields === undefined) {
				return;
			}
			const ctx = contextFromExpressRequest(req);
			res.json(
				await updateProfile(ctx, {
					...fields,
					...(req.file?.buffer ? { file: req.file.buffer } : {}),
				})
			);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
