import { Router } from "express";

import { AssignmentController } from "../controllers/assignment.controller.js";
import {
	requireNutritionistOrgContext,
	requireSession,
} from "../middlewares/auth-middleware.js";

/**
 * Diet-plan assignments and the member's food swaps.
 *
 * Two audiences on one resource: nutritionists manage assignments inside their
 * organization, members read their own and override individual meal items. The
 * guards differ accordingly, and every handler re-asserts the same rule anyway.
 */
export function createAssignmentRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const nutritionistOrg = [
		requireSession(),
		requireNutritionistOrgContext(),
	] as const;
	const member = [requireSession()] as const;

	const slotPath =
		"/member/me/diet-plan-assignments/:assignmentId/meal-entries/:dietPlanMealId/items/:mealItemId";
	const overridePath = `${slotPath}/override`;
	const alternativesPath = `${slotPath}/alternatives`;

	router.get(
		"/nutritionist/diet-plan-assignments",
		...nutritionistOrg,
		AssignmentController.listForNutritionist
	);
	router.post(
		"/nutritionist/diet-plan-assignments",
		...nutritionistOrg,
		AssignmentController.createForNutritionist
	);
	router.get(
		"/nutritionist/diet-plan-assignments/:id",
		...nutritionistOrg,
		AssignmentController.getForNutritionist
	);
	router.patch(
		"/nutritionist/diet-plan-assignments/:id",
		...nutritionistOrg,
		AssignmentController.updateForNutritionist
	);
	router.delete(
		"/nutritionist/diet-plan-assignments/:id",
		...nutritionistOrg,
		AssignmentController.deleteForNutritionist
	);

	router.get(
		"/member/me/diet-plan-assignments",
		...member,
		AssignmentController.listForMember
	);

	// PUT is what the native client sends; PATCH is kept for parity with the
	// pre-overhaul route, which exported both.
	router.put(overridePath, ...member, AssignmentController.setMealItemOverride);
	router.patch(
		overridePath,
		...member,
		AssignmentController.setMealItemOverride
	);
	router.delete(
		overridePath,
		...member,
		AssignmentController.deleteMealItemOverride
	);

	// Alternatives for the food the slot currently shows on `?date=`; the food
	// and the quantity are resolved server-side, so there is no `quantity` param.
	router.get(
		alternativesPath,
		...member,
		AssignmentController.listMealItemAlternatives
	);

	return router;
}
