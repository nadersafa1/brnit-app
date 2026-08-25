import { Router } from "express";

import { HealthController } from "../controllers/health.controller.js";

/**
 * Liveness only. Mounted at the app root (outside `/api/v1`) because
 * docker-compose's healthcheck and Dokploy both probe `/`.
 */
export function createHealthRouter(): Router {
	const router = Router();
	router.get("/", HealthController.root);
	return router;
}
