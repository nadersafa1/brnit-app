import { env } from "@brnit/env/web";
import { REALTIME_EVENTS } from "@brnit/realtime";
import { io, type Socket } from "socket.io-client";

/**
 * The browser half of the realtime transport.
 *
 * Nothing here knows about a screen or a query key — it builds the one socket
 * the app session owns and wraps the two room-protocol emits, so no call site
 * has to hard-code an event name.
 */

/**
 * Hard-coded rather than derived from `VITE_API_VERSION`, because the server
 * hard-codes it too (`apps/server/src/sockets/socket-server.ts`). Deriving it
 * would let a client version bump silently move the client off a path the
 * server never moved, which fails as a connect timeout rather than a 404.
 */
const SOCKET_PATH = "/api/v1/socket.io";

const RECONNECTION_ATTEMPTS = 10;

/**
 * The app's socket, **not yet connected**.
 *
 * `autoConnect: false` is the point: `io()` would otherwise open the connection
 * during this call, and any `connect` that lands before the caller has finished
 * registering its handlers is lost. `useRealtimeSocket` registers first and
 * calls `socket.connect()` last, which makes that ordering a guarantee instead
 * of a race the event loop usually happens to win.
 *
 * Authentication is the Better Auth session cookie, which the browser attaches
 * to the handshake itself once `withCredentials` is set — the same cookie the
 * REST calls use. There is deliberately no `extraHeaders`: browsers forbid
 * setting `Cookie` from script, so that is the native app's workaround only.
 */
export function createRealtimeSocket(): Socket {
	return io(env.VITE_SERVER_URL, {
		autoConnect: false,
		path: SOCKET_PATH,
		reconnection: true,
		reconnectionAttempts: RECONNECTION_ATTEMPTS,
		transports: ["websocket", "polling"],
		withCredentials: true,
	});
}

/**
 * Asks the server to add this socket to `room`.
 *
 * The answer is asynchronous and negative-only: a refusal arrives as
 * `realtime:join-error`, and a success is silent. Callers build `room` with a
 * builder from `@brnit/realtime` — never a template literal — so the string the
 * server re-parses is the one its own parser produced.
 */
export function joinRealtimeRoom(socket: Socket, room: string): void {
	socket.emit(REALTIME_EVENTS.JOIN, { room });
}

export function leaveRealtimeRoom(socket: Socket, room: string): void {
	socket.emit(REALTIME_EVENTS.LEAVE, { room });
}
