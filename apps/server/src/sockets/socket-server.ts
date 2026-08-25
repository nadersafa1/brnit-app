import type { Server as HttpServer } from "node:http";
import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, type RedisClientType } from "redis";
import { Server } from "socket.io";

export interface SocketServerBundle {
	closeRedisAdapter: () => Promise<void>;
	io: Server;
}

let redisPubClient: RedisClientType | undefined;
let redisSubClient: RedisClientType | undefined;

/**
 * Creates the Socket.IO server attached to the API's HTTP server.
 *
 * With `REDIS_URL` set, the Redis adapter fans events out across every API
 * replica (and lets the worker process emit through the emitter). Without it,
 * the server still runs, single-process — that is the local-dev path.
 *
 * TODO: no namespaces, rooms or events exist yet. A connection cannot do
 * anything today, so there is nothing to authorize. Before the first event is
 * added, a `socket-auth.middleware.ts` (Better Auth cookie → `socket.data.user`)
 * and room-authorization handlers must land alongside it.
 */
export async function createSocketServer(
	httpServer: HttpServer
): Promise<SocketServerBundle> {
	const io = new Server(httpServer, {
		path: "/api/v1/socket.io",
		serveClient: false,
		transports: ["websocket", "polling"],
		allowUpgrades: true,
		pingInterval: 25_000,
		pingTimeout: 60_000,
		connectTimeout: 45_000,
		maxHttpBufferSize: 1_000_000,
		perMessageDeflate: true,
		httpCompression: true,
		cors: {
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST"],
			allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
			credentials: true,
		},
	});

	if (env.REDIS_URL) {
		redisPubClient = createClient({ url: env.REDIS_URL });
		redisSubClient = redisPubClient.duplicate();
		await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);
		io.adapter(createAdapter(redisPubClient, redisSubClient));
		logger.info("socket.io Redis adapter attached");
	} else {
		logger.warn("socket.io running without Redis adapter (no REDIS_URL set)");
	}

	return {
		io,
		closeRedisAdapter: async () => {
			await Promise.all([redisPubClient?.quit(), redisSubClient?.quit()]);
			redisPubClient = undefined;
			redisSubClient = undefined;
		},
	};
}
