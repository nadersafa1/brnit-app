import { getLogger } from "@brnit/logger";
import type { Request, Response } from "express";

import { runHealthChecks } from "../lib/health/run-health-checks.js";
import { errorMessage } from "../lib/health/utils.js";

/** Controllers are classes with only static methods, bound from route files. */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape
export class HealthController {
	/** Liveness probe for orchestrators — no dependency checks, always cheap. */
	static root(_req: Request, res: Response): void {
		res.type("text/plain").send("OK");
	}

	/** Readiness probe: PostgreSQL, Redis `PING`, and BullMQ job counts. */
	static async apiHealth(_req: Request, res: Response): Promise<void> {
		try {
			const report = await runHealthChecks();
			res.status(report.ok ? 200 : 503).json(report);
		} catch (err) {
			getLogger().error({ err }, "health check failed");
			res.status(503).json({ ok: false, error: errorMessage(err) });
		}
	}
}
