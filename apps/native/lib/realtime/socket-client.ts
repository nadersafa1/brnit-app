import { env } from "@brnit/env/native";
import { io, type Socket } from "socket.io-client";

import { authClient } from "@/lib/auth-client";

/** Where the server mounts Socket.IO — see `apps/server/src/sockets/socket-server.ts`. */
const SOCKET_PATH = "/api/v1/socket.io";

const RECONNECTION_ATTEMPTS = 10;

function getSocketBaseUrl(): string {
	if (!env.EXPO_PUBLIC_SERVER_URL) {
		throw new Error("EXPO_PUBLIC_SERVER_URL is not set");
	}
	return env.EXPO_PUBLIC_SERVER_URL;
}

/**
 * Builds the app's realtime socket, **unconnected**.
 *
 * Two options are load-bearing:
 *
 * - `extraHeaders.Cookie`. The handshake is authenticated with the same Better
 *   Auth session cookie the REST API uses, but React Native has no cookie jar,
 *   so `withCredentials` would attach nothing and the server would refuse the
 *   connection with `UNAUTHENTICATED`. The cookie is read out of SecureStore by
 *   `@better-auth/expo`, exactly as `apiFetch` does in `lib/api/client.ts`.
 * - `autoConnect: false`. The caller connects only once every handler is
 *   registered. With the default the socket can reach `connect` — and the server
 *   can emit into it — before `socket.on(...)` has run, which would drop the
 *   first event of the session.
 */
export function createRealtimeSocket(): Socket {
	const cookie = authClient.getCookie();
	return io(getSocketBaseUrl(), {
		autoConnect: false,
		extraHeaders: cookie ? { Cookie: cookie } : {},
		path: SOCKET_PATH,
		reconnection: true,
		reconnectionAttempts: RECONNECTION_ATTEMPTS,
		transports: ["websocket", "polling"],
	});
}
