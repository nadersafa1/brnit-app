import "dotenv/config";
// Instrumentation must run before any module under observation is imported.
import "./instrumentation.js";

process.env.TZ ??= "UTC";

import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";
import type { Worker } from "bullmq";

const workerLog = logger.child({ component: "worker-background" });

/**
 * Nothing holds the event loop open until the first BullMQ worker exists, and
 * compose restarts this service on exit — so idle deliberately instead of
 * crash-looping. Delete this once a worker is registered below.
 */
const IDLE_KEEPALIVE_MS = 60_000;

function startIdleKeepAlive(): NodeJS.Timeout {
	workerLog.warn(
		"no background workers registered; idling to avoid a restart loop"
	);
	return setInterval(() => {
		// Intentionally empty: the timer exists only to keep the process alive.
	}, IDLE_KEEPALIVE_MS);
}

function registerShutdownHandlers(
	workers: readonly Worker[],
	keepAlive: NodeJS.Timeout | undefined
): void {
	const shutdown = async (): Promise<void> => {
		workerLog.info({ workerCount: workers.length }, "shutting down workers");
		if (keepAlive) {
			clearInterval(keepAlive);
		}
		await Promise.all(workers.map((worker) => worker.close()));
		process.exit(0);
	};

	const onSignal = (signal: string): void => {
		workerLog.info({ signal }, "received shutdown signal");
		shutdown().catch((err: unknown) => {
			workerLog.error({ err }, "shutdown failed");
			process.exit(1);
		});
	};

	process.on("SIGTERM", () => {
		onSignal("SIGTERM");
	});
	process.on("SIGINT", () => {
		onSignal("SIGINT");
	});
}

/**
 * Background worker process (the compose `worker` service).
 *
 * Runs BullMQ workers only — it never listens on a port and never serves HTTP.
 * Cron schedules register here, *after* the workers are listening, so a
 * scheduled job can never fire into a queue with no consumer.
 */
function main(): void {
	if (!env.REDIS_URL) {
		workerLog.error("REDIS_URL is required to run background workers");
		process.exitCode = 1;
		return;
	}

	// TODO: brnit has no background jobs yet. Each one contributes a
	// `startXWorker()` from `src/workers/<name>.worker.ts` to this array, calls
	// `registerProbeQueue` from its queue module so readiness sees it, and
	// registers any cron via `upsertJobScheduler` below.
	const workers: Worker[] = [];

	const keepAlive = workers.length === 0 ? startIdleKeepAlive() : undefined;

	workerLog.info({ workerCount: workers.length }, "all workers started");

	registerShutdownHandlers(workers, keepAlive);
}

try {
	main();
} catch (error: unknown) {
	workerLog.error({ err: error }, "failed to start workers");
	process.exitCode = 1;
}
