import { env } from "@brnit/env/server";
import cors from "cors";
import express, { type Express } from "express";

import { registerQueueHandlers } from "../jobs/register-queue-handlers.js";
import { auditMiddleware } from "../middlewares/audit.middleware.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";
import {
	pinoHttpLogger,
	requestContextMiddleware,
} from "../middlewares/http-logger.middleware.js";
import { createApiRouter } from "../routes/api.router.js";
import { registerAuthRoutes } from "../routes/auth.routes.js";
import { createHealthRouter } from "../routes/health.routes.js";

// Fills the registry slots `@brnit/api` declares, so handlers can dispatch
// push and jobs without importing BullMQ. Module scope, not inside setupApp:
// the API process must wire this exactly once, before any route can fire an
// intent. The worker process calls it separately from worker-background.ts.
registerQueueHandlers();

const corsOptions: cors.CorsOptions = {
	origin: env.CORS_ORIGIN,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
};

/**
 * The canonical middleware order. It is load-bearing — see
 * `docs/migration/architecture.md`. Do not reorder without updating that doc.
 */
export function setupApp(app: Express): void {
	// 1. Access logging + correlation id, before everything else so that even
	//    auth and CORS failures carry a request id.
	app.use(pinoHttpLogger);

	// 2. AsyncLocalStorage binding, so `getLogger()` works at any depth.
	app.use(requestContextMiddleware);

	// 3. CORS, including an explicit preflight responder.
	app.use(cors(corsOptions));
	app.options("*", cors(corsOptions));

	// 4. Better Auth — mounted BEFORE `express.json()` on purpose. `toNodeHandler`
	//    rebuilds a Web `Request` from the raw Node stream, so it needs the body
	//    unconsumed. A body parser here would leave better-auth reading an
	//    already-drained stream and every sign-in would hang or 400.
	registerAuthRoutes(app);

	// 5. JSON body parsing for everything else.
	app.use(express.json());

	// 6. Audit writer. Occupies the canonical "api-error event" slot: it attaches
	//    a `res.on("finish")` hook, so it must be registered before the routers
	//    that will answer the request. No-ops unless AUDIT_LOG_DB_ENABLED.
	app.use(auditMiddleware);

	// 7. The versioned API.
	app.use("/api/v1", createApiRouter());

	// 8. Root liveness probe.
	app.use(createHealthRouter());

	// 9. JSON 404 for anything unmatched, so clients never receive Express' HTML.
	app.use((_req, res) => {
		res.status(404).json({ error: "Not found" });
	});

	// 10. Terminal error handler, always last.
	app.use(errorMiddleware);
}
