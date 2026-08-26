import { Router } from "express";

import { AssessmentController } from "../controllers/assessment.controller.js";
import {
	requireAssessmentWriteAuth,
	requireNutritionistOrgContext,
	requireSession,
} from "../middlewares/auth-middleware.js";
import { handleImageUpload } from "../middlewares/image-upload.middleware.js";

const DIRECT_ADMIN_BASE = "/direct-admin/body-composition-assessments";

/**
 * Body-composition assessments: full CRUD for direct admins and owners, plus
 * the nutritionist's read-only mirror of the same list.
 *
 * `handleImageUpload` runs **after** the guards so an unauthorized request is
 * rejected before its multipart body is read into memory.
 */
export function createAssessmentRouter(): Router {
	const router = Router();

	// Declared inside the factory so route tests can mock the auth middleware
	// before this module finishes loading.
	const assessmentWrite = [
		requireSession(),
		requireAssessmentWriteAuth(),
	] as const;
	const nutritionistRead = [
		requireSession(),
		requireNutritionistOrgContext(),
	] as const;

	router.get(DIRECT_ADMIN_BASE, ...assessmentWrite, AssessmentController.list);
	router.post(
		DIRECT_ADMIN_BASE,
		...assessmentWrite,
		handleImageUpload,
		AssessmentController.post
	);
	router.get(
		`${DIRECT_ADMIN_BASE}/:id`,
		...assessmentWrite,
		AssessmentController.getById
	);
	router.patch(
		`${DIRECT_ADMIN_BASE}/:id`,
		...assessmentWrite,
		handleImageUpload,
		AssessmentController.patch
	);
	router.delete(
		`${DIRECT_ADMIN_BASE}/:id`,
		...assessmentWrite,
		AssessmentController.delete
	);

	router.get(
		"/nutritionist/body-composition-assessments",
		...nutritionistRead,
		AssessmentController.list
	);

	return router;
}
