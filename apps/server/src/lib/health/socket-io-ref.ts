import type { Server } from "socket.io";

let socketIo: Server | undefined;

/**
 * Setter injection from the server entry after `createSocketServer`.
 * Keeps `lib/health` free of a socket.io import cycle through the entrypoint.
 */
export function setSocketIoForHealth(io: Server): void {
	socketIo = io;
}

export function getSocketIoForHealth(): Server | undefined {
	return socketIo;
}
