import { isAppAdmin } from "@brnit/domain";

import type { Context } from "../context";
import { HttpError } from "../http-error";

/**
 * Who may manage the shared nutrition catalog — meals and diet plans.
 *
 * Both are **global** entities: they belong to no organization, and the admin
 * and nutritionist route trees mount the very same handlers. The predicate is
 * therefore the union of the two guards that front them:
 *
 * - `requireAdmin` — app role `admin`
 * - `requireNutritionist` — app admin, the global `nutritionist` app role, or
 *   the org role `nutritionist` with an active organization
 *
 * Handlers call {@link assertCanManageMeals} (or the diet-plan alias) rather
 * than trusting the guard that happened to run: the same handler is reachable
 * from two route trees today, and from a job or a test tomorrow.
 */

const APP_NUTRITIONIST_ROLE = "nutritionist";

/** Everything the catalog check needs, independent of Express and better-auth. */
export interface NutritionCatalogActor {
	/** `user.role` — plain `text`, so anything could be in there. */
	appRole: string | null | undefined;
	/** The organization the request was authorized against, if any. */
	activeOrgId: string | null | undefined;
	/** True when the caller's `member.role` in that organization is `nutritionist`. */
	isOrgNutritionist: boolean;
}

export function canManageNutritionCatalog(
	actor: NutritionCatalogActor
): boolean {
	if (isAppAdmin(actor.appRole)) {
		return true;
	}
	if (actor.appRole === APP_NUTRITIONIST_ROLE) {
		return true;
	}
	return Boolean(actor.activeOrgId) && actor.isOrgNutritionist;
}

/** Projects a handler {@link Context} onto {@link NutritionCatalogActor}. */
export function nutritionCatalogActorFromContext(
	ctx: Context
): NutritionCatalogActor {
	return {
		activeOrgId: ctx.organizationId ?? ctx.organization?.activeOrgId ?? null,
		appRole: ctx.user?.role ?? null,
		isOrgNutritionist: ctx.organization?.isNutritionist === true,
	};
}

/**
 * Throws 401 for an anonymous caller and 403 for an authenticated one without
 * catalog access.
 *
 * The split matters: the clients treat 401 as "sign in again" and 403 as
 * "you are signed in but not allowed", and the pre-overhaul routes answered
 * exactly this way once a session existed.
 */
export function assertCanManageMeals(ctx: Context): void {
	if (!ctx.user) {
		throw new HttpError(401, "Unauthorized");
	}
	if (!canManageNutritionCatalog(nutritionCatalogActorFromContext(ctx))) {
		throw new HttpError(
			403,
			"Forbidden: admin or nutritionist role required to manage meals"
		);
	}
}
