import { queryParam } from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";

import { AssessmentController } from "../controllers/assessment.controller.js";
import { MemberController } from "../controllers/member.controller.js";
import {
	requireMemberOrg,
	requireSession,
} from "../middlewares/auth-middleware.js";

type RouteMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<void> | void;

/**
 * `/member/me/**` — everything a signed-in member reads about themselves.
 *
 * The two body-composition reads live here rather than in the assessment
 * router because they are member-scoped: they answer "my assessments", not
 * "the organization's".
 */
export function createMemberRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const memberSession = [requireSession()] as const;
	const memberOrgScoped = [requireSession(), requireMemberOrg()] as const;

	/**
	 * The recent-assessments read is org-scoped **only when `?orgId` is sent**.
	 * Without it the endpoint deliberately spans every organization the user
	 * belongs to, so running `requireMemberOrg` unconditionally would reject a
	 * member who simply has no active organization set.
	 */
	const requireMemberOrgWhenScoped = (): RouteMiddleware => {
		const guard = requireMemberOrg();
		return (req, res, next) => {
			if (queryParam(req.query.orgId)?.trim()) {
				return guard(req, res, next);
			}
			next();
		};
	};

	router.get(
		"/member/me/current-diet-plan",
		...memberSession,
		MemberController.getCurrentDietPlan
	);
	router.get(
		"/member/me/consumption-streak",
		...memberSession,
		MemberController.getConsumptionStreak
	);
	router.get(
		"/member/me/organization-leaderboard",
		...memberOrgScoped,
		MemberController.getOrganizationLeaderboard
	);

	// `/recent` must be registered before `/:id`, or Express matches it as an id.
	router.get(
		"/member/me/body-composition-assessments/recent",
		...memberSession,
		requireMemberOrgWhenScoped(),
		AssessmentController.listMemberRecent
	);
	router.get(
		"/member/me/body-composition-assessments/:id",
		...memberOrgScoped,
		AssessmentController.getMemberById
	);

	return router;
}
