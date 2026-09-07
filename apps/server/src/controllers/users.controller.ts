import { auth } from "@brnit/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";

import { resolveOrganizationContext } from "../middlewares/organization-context.js";
import { handleHandlerError } from "../utils/http.js";

// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class UsersController {
	/**
	 * `GET /users/me/organization-context`.
	 *
	 * Deliberately **unguarded**: it answers 200 with the anonymous shape when
	 * there is no session, because both clients call it before they know
	 * whether one exists and a 401 would surface as an error toast on first
	 * paint. It resolves the session itself for the same reason —
	 * `requireSession()` would reject exactly the case this endpoint exists to
	 * answer.
	 *
	 * The precedence rules (app admin → active organization → sole membership)
	 * live in `resolveOrganizationContext`, shared with every org-aware guard.
	 */
	static async getOrganizationContext(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const session = await auth.api.getSession({
				headers: fromNodeHeaders(req.headers),
			});
			const context = await resolveOrganizationContext(
				session?.user ? { session: session.session, user: session.user } : null
			);
			res.json(context);
		} catch (err) {
			handleHandlerError(err, res, next);
		}
	}
}
