import { db } from "@brnit/db";
import { env } from "@brnit/env/server";
import { getLogger } from "@brnit/logger";
import { sql } from "drizzle-orm";
import { createClient, type RedisClientType } from "redis";

import { getProbeQueues } from "../../jobs/probe-queues.js";
import type { HealthCheckResult } from "./types.js";
import {
	NO_QUEUES_REGISTERED_REASON,
	REDIS_NOT_CONFIGURED_REASON,
	runTimedCheck,
	skippedCheck,
} from "./utils.js";

/** BullMQ job states included in the readiness probe (metadata read only). */
const BULLMQ_PROBE_JOB_TYPES = [
	"waiting",
	"active",
	"completed",
	"failed",
	"delayed",
] as const;

const EXPECTED_PING_REPLY = "PONG";

let healthRedisClient: RedisClientType | undefined;

/** Verifies PostgreSQL connectivity through the same Drizzle pool handlers use. */
export function checkDatabase(): Promise<HealthCheckResult> {
	return runTimedCheck("database", async () => {
		await db.execute(sql`select 1`);
	});
}

/**
 * One long-lived client for the readiness probe. Kept apart from the socket.io
 * adapter's pair, which are in pub/sub mode and cannot answer `PING`.
 */
async function getHealthRedisClient(url: string): Promise<RedisClientType> {
	if (!healthRedisClient) {
		const client: RedisClientType = createClient({ url });
		client.on("error", (err: unknown) => {
			getLogger().error({ err }, "health redis client error");
		});
		healthRedisClient = client;
	}
	if (!healthRedisClient.isOpen) {
		await healthRedisClient.connect();
	}
	return healthRedisClient;
}

/** Closes the probe connection during graceful shutdown. */
export async function closeHealthRedisClient(): Promise<void> {
	if (healthRedisClient?.isOpen) {
		await healthRedisClient.quit();
	}
	healthRedisClient = undefined;
}

async function pingRedis(url: string): Promise<void> {
	const client = await getHealthRedisClient(url);
	const reply = await client.ping();
	if (reply !== EXPECTED_PING_REPLY) {
		throw new Error(`unexpected PING response: ${String(reply)}`);
	}
}

async function readQueueJobCounts(): Promise<void> {
	// One representative queue proves BullMQ can reach Redis; probing every
	// queue on each readiness check opens many connections and risks the timeout.
	const primary = getProbeQueues()[0];
	if (!primary) {
		return;
	}
	await primary.waitUntilReady();
	await primary.getJobCounts(...BULLMQ_PROBE_JOB_TYPES);
}

/** Probes Redis (`PING`) and BullMQ (job counts) when `REDIS_URL` is set. */
export async function checkRedisAndBullMq(): Promise<{
	bullmq: HealthCheckResult;
	redis: HealthCheckResult;
}> {
	const redisUrl = env.REDIS_URL;
	if (!redisUrl) {
		const skipped = skippedCheck(REDIS_NOT_CONFIGURED_REASON);
		return { bullmq: skipped, redis: skipped };
	}

	const redis = await runTimedCheck("redis", () => pingRedis(redisUrl));
	if (redis.status === "down" || getProbeQueues().length === 0) {
		return {
			bullmq:
				redis.status === "down"
					? redis
					: skippedCheck(NO_QUEUES_REGISTERED_REASON),
			redis,
		};
	}

	const bullmq = await runTimedCheck("bullmq", readQueueJobCounts);
	return { bullmq, redis };
}
