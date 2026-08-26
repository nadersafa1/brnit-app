import { checkDatabase, checkRedisAndBullMq } from "./checks.js";
import { getSocketIoForHealth } from "./socket-io-ref.js";
import type { HealthCheckResult, HealthReport } from "./types.js";

function isCheckHealthy(check: HealthCheckResult): boolean {
	return check.status === "up" || check.status === "skipped";
}

/**
 * Runs dependency probes in parallel where safe:
 * - PostgreSQL is independent.
 * - Redis and BullMQ share a connection, so they run in one sequence.
 *
 * The database must be `up`. Redis/BullMQ matter only when `REDIS_URL` is set;
 * otherwise they report `skipped` and do not fail readiness. When Socket.IO is
 * attached the report also carries `engine.clientsCount` for ops visibility.
 */
export async function runHealthChecks(): Promise<HealthReport> {
	const [database, redisStack] = await Promise.all([
		checkDatabase(),
		checkRedisAndBullMq(),
	]);

	const checks = {
		bullmq: redisStack.bullmq,
		database,
		redis: redisStack.redis,
	};

	const io = getSocketIoForHealth();

	return {
		ok: Object.values(checks).every(isCheckHealthy),
		checks,
		...(io ? { socket: { clientsCount: io.engine.clientsCount } } : {}),
	};
}
