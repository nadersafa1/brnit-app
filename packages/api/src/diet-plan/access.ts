import type { Context } from "../context";
import { HttpError } from "../http-error";
import {
	canManageNutritionCatalog,
	nutritionCatalogActorFromContext,
} from "../meal/access";

/**
 * Diet plans are governed by the same rule as meals — both are the global
 * nutrition catalog, and both mount the same handlers under `/admin` and
 * `/nutritionist`. The predicate therefore lives once, next to meals, and this
 * module only supplies the diet-plan wording.
 */
export function assertCanManageDietPlans(ctx: Context): void {
	if (!ctx.user) {
		throw new HttpError(401, "Unauthorized");
	}
	if (!canManageNutritionCatalog(nutritionCatalogActorFromContext(ctx))) {
		throw new HttpError(
			403,
			"Forbidden: admin or nutritionist role required to manage diet plans"
		);
	}
}
