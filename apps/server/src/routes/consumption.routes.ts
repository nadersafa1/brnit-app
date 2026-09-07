import { Router } from "express";

import { ConsumptionController } from "../controllers/consumption.controller.js";
import {
	requireNutritionistOrgContext,
	requireSession,
} from "../middlewares/auth-middleware.js";

/**
 * Meal consumptions.
 *
 * The member routes are the hot path — the native Home screen marks and unmarks
 * meals through them — while the nutritionist routes are reporting plus the
 * occasional correction on a client's behalf.
 */
export function createConsumptionRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const nutritionistOrg = [
		requireSession(),
		requireNutritionistOrgContext(),
	] as const;
	const member = [requireSession()] as const;

	router.get(
		"/nutritionist/diet-plan-meal-consumptions",
		...nutritionistOrg,
		ConsumptionController.listForNutritionist
	);
	router.post(
		"/nutritionist/diet-plan-meal-consumptions",
		...nutritionistOrg,
		ConsumptionController.createForNutritionist
	);
	router.delete(
		"/nutritionist/diet-plan-meal-consumptions/:id",
		...nutritionistOrg,
		ConsumptionController.deleteForNutritionist
	);

	router.get(
		"/member/me/diet-plan-meal-consumptions",
		...member,
		ConsumptionController.listForMember
	);
	router.post(
		"/member/me/diet-plan-meal-consumptions",
		...member,
		ConsumptionController.createForMember
	);
	router.delete(
		"/member/me/diet-plan-meal-consumptions",
		...member,
		ConsumptionController.deleteForMemberBySlot
	);

	return router;
}
