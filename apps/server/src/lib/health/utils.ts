import type { HealthCheckResult } from "./types.js";

/** A readiness probe must answer fast enough for an orchestrator's timeout. */
const CHECK_TIMEOUT_MS = 3000;

export const REDIS_NOT_CONFIGURED_REASON = "REDIS_URL not configured";

export const NO_QUEUES_REGISTERED_REASON = "no BullMQ queues registered";

export function skippedCheck(reason: string): HealthCheckResult {
	return { status: "skipped", reason };
}

export function errorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "string") {
		return err;
	}
	try {
		return JSON.stringify(err);
	} catch {
		return "unknown error";
	}
}

/** Rejects when `fn` exceeds `timeoutMs`; clears the timer when work finishes. */
function withTimeout<T>(
	label: string,
	fn: () => Promise<T>,
	timeoutMs = CHECK_TIMEOUT_MS
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		fn()
			.then(resolve)
			.catch(reject)
			.finally(() => {
				clearTimeout(timer);
			});
	});
}

/** Wraps an async probe with a timeout, latency measurement and up/down mapping. */
export async function runTimedCheck(
	label: string,
	probe: () => Promise<void>
): Promise<HealthCheckResult> {
	const start = performance.now();
	try {
		await withTimeout(label, probe);
		return { status: "up", latencyMs: Math.round(performance.now() - start) };
	} catch (err) {
		return { status: "down", error: errorMessage(err) };
	}
}
