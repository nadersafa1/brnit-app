import { randomUUID } from "node:crypto";
import { logger, REQUEST_ID_HEADER } from "@brnit/logger";
import type { ExtendedError } from "socket.io";

import type { AppSocket } from "../socket-types.js";

/**
 * Binds a correlated child logger to the socket, before auth runs.
 *
 * Registered first so a rejected handshake is still logged with an id: a client
 * that cannot authenticate is exactly the case worth correlating, and
 * `socketAuth` reads `socket.data.log` when it fails.
 *
 * Reuses the inbound `x-request-id` when the client sent one, so a websocket
 * upgrade lines up with the HTTP requests around it.
 */
export function socketLogger(
	socket: AppSocket,
	next: (err?: ExtendedError) => void
): void {
	const inbound = socket.handshake.headers[REQUEST_ID_HEADER];
	const requestId =
		(Array.isArray(inbound) ? inbound[0] : inbound) ?? randomUUID();
	socket.data.requestId = requestId;
	socket.data.log = logger.child({
		requestId,
		socketId: socket.id,
		transport: "ws",
	});
	socket.data.log.info("ws connection attempt");
	next();
}
