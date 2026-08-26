import type { Server as HttpServer } from "node:http";
import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, type RedisClientType } from "redis";
import { Server } from "socket.io";

import { registerConnectionHandler } from "./handlers/connection.handler.js";
import { registerJoinRoomsHandler } from "./handlers/join-rooms.handler.js";
import { socketAuth } from "./middlewares/socket-auth.middleware.js";
import { socketLogger } from "./middlewares/socket-logger.middleware.js";
import { setSocketIoForEmit } from "./realtime-emit.service.js";
import type { AppServer } from "./socket-types.js";

export interface SocketServerBundle {
	closeRedisAdapter: () => Promise<void>;
	io: AppServer;
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
 * Middleware order is load-bearing: `socketLogger` first so a handshake that
 * fails authentication is still logged with a request id, then `socketAuth`,
 * which refuses the connection outright when there is no session. Every handler
 * registered afterwards can therefore assume `socket.data.user` exists.
 */
export async function createSocketServer(
	httpServer: HttpServer
): Promise<SocketServerBundle> {
	const io: AppServer = new Server(httpServer, {
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

	io.use(socketLogger);
	io.use(socketAuth);

	registerConnectionHandler(io);
	registerJoinRoomsHandler(io);

	// Publish the instance for the emit service here rather than from the
	// entrypoint, so the API process cannot end up serving sockets while
	// silently emitting through Redis.
	setSocketIoForEmit(io);

	return {
		io,
		closeRedisAdapter: async () => {
			await Promise.all([redisPubClient?.quit(), redisSubClient?.quit()]);
			redisPubClient = undefined;
			redisSubClient = undefined;
		},
	};
}
