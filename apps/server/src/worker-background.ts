import "dotenv/config";
// Instrumentation must run before any module under observation is imported.
import "./instrumentation.js";

process.env.TZ ??= "UTC";

import { env } from "@brnit/env/server";
import type { Worker } from "bullmq";

import { registerQueueHandlers } from "./jobs/register-queue-handlers.js";
import { createWorkerLogger } from "./jobs/worker-logger.js";
import { closeIoEmitter } from "./sockets/redis-emitter.js";
import {
	registerMealReminderScheduler,
	startMealReminderWorker,
} from "./workers/meal-reminder.worker.js";
import { startPushNotificationWorker } from "./workers/push-notification.worker.js";
import {
	registerStreakNudgeScheduler,
	startStreakNudgeWorker,
} from "./workers/streak-nudge.worker.js";

const workerLog = createWorkerLogger("worker-background");

function registerShutdownHandlers(workers: readonly Worker[]): void {
	const shutdown = async (): Promise<void> => {
		workerLog.info({ workerCount: workers.length }, "shutting down workers");
		await Promise.all(workers.map((worker) => worker.close()));
		// Closed after the workers, because a job still draining may emit.
		await closeIoEmitter();
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
 * The workers themselves hold the event loop open, which is what replaced the
 * idle keep-alive this file used to need: with no worker registered, the
 * process exited immediately and compose's restart policy turned that into a
 * crash loop.
 *
 * Cron schedules register **after** the workers are listening, so a scheduled
 * job can never fire into a queue with no consumer.
 */
async function main(): Promise<void> {
	if (!env.REDIS_URL) {
		workerLog.error("REDIS_URL is required to run background workers");
		process.exitCode = 1;
		return;
	}

	// Fill the `@brnit/api` registry slots here too: a handler called from
	// inside a job needs the same dispatch path a controller gets.
	registerQueueHandlers();

	const workers: Worker[] = [
		startPushNotificationWorker(),
		startMealReminderWorker(),
		startStreakNudgeWorker(),
	];

	await registerMealReminderScheduler();
	await registerStreakNudgeScheduler();

	workerLog.info({ workerCount: workers.length }, "all workers started");

	registerShutdownHandlers(workers);
}

try {
	await main();
} catch (error: unknown) {
	workerLog.error({ err: error }, "failed to start workers");
	process.exitCode = 1;
}
