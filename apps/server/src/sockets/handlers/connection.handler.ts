import { userRoom } from "@brnit/realtime";
import type { AppServer } from "../socket-types.js";

/**
 * Joins every authenticated socket to its own `user:<id>` room and logs the
 * connection lifecycle.
 *
 * The auto-join is why `user:` rooms are never joinable by request: the only
 * room a socket needs for itself, it is already in, so an explicit join can
 * only ever be an attempt to watch somebody else.
 */
export function registerConnectionHandler(io: AppServer): void {
	io.on("connection", (socket) => {
		const { user, log } = socket.data;

		Promise.resolve(socket.join(userRoom(user.id))).catch((err: unknown) => {
			log.error({ err, userId: user.id }, "failed to join user room");
		});
		log.info({ userId: user.id }, "ws connected");

		socket.on("disconnect", (reason) => {
			log.info({ userId: user.id, reason }, "ws disconnected");
		});

		socket.on("error", (err) => {
			log.error({ err, userId: user.id }, "ws error");
		});
	});
}
