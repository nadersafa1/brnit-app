import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";
import { Emitter } from "@socket.io/redis-emitter";
import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | undefined;
let ioEmitter: Emitter | undefined;

/**
 * Lazy singleton for cross-process emits.
 *
 * A BullMQ worker has no `Server` instance — it never accepted a socket — so it
 * publishes to the same Redis channels the adapter listens on and lets the API
 * replicas do the delivery. Uses the official `redis` client because that is
 * what `@socket.io/redis-emitter` requires.
 *
 * Returns `undefined` without `REDIS_URL`: in single-process local dev the
 * emit path uses the in-process `Server` instead.
 */
export async function getIoEmitter(): Promise<Emitter | undefined> {
	if (!env.REDIS_URL) {
		return;
	}
	if (ioEmitter) {
		return ioEmitter;
	}

	redisClient = createClient({ url: env.REDIS_URL });
	redisClient.on("error", (err: unknown) => {
		logger.error({ err }, "socket.io redis emitter client error");
	});
	redisClient.on("reconnecting", () => {
		logger.warn("socket.io redis emitter client reconnecting");
	});
	await redisClient.connect();
	ioEmitter = new Emitter(redisClient);
	return ioEmitter;
}

/** Closes the emitter connection during worker shutdown. */
export async function closeIoEmitter(): Promise<void> {
	await redisClient?.quit();
	redisClient = undefined;
	ioEmitter = undefined;
}
