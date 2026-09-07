import { auth } from "@brnit/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { ExtendedError } from "socket.io";

import {
	isUserBanned,
	USER_BANNED_ERROR_CODE,
} from "../../middlewares/auth-middleware.js";
import type { AppSocket } from "../socket-types.js";

const UNAUTHENTICATED_ERROR_CODE = "UNAUTHENTICATED";

function refuse(
	next: (err?: ExtendedError) => void,
	message: string,
	code: string
): void {
	// socket.io only forwards `err.data` to the client, so the machine-readable
	// code has to ride there rather than on the message.
	next(Object.assign(new Error(message), { data: { code } }));
}

/**
 * Authenticates the handshake with the same Better Auth session the HTTP API
 * uses — the cookie is on the upgrade request's headers, so no separate socket
 * token scheme is needed.
 *
 * Runs on connect only. A socket therefore outlives the session that opened it,
 * which is why every room join re-checks authorization against the database
 * rather than trusting `socket.data.user` alone.
 */
export async function socketAuth(
	socket: AppSocket,
	next: (err?: ExtendedError) => void
): Promise<void> {
	try {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(socket.request.headers),
		});
		if (!session) {
			refuse(next, "Authentication required", UNAUTHENTICATED_ERROR_CODE);
			return;
		}
		if (isUserBanned(session.user)) {
			refuse(next, "Account suspended", USER_BANNED_ERROR_CODE);
			return;
		}
		socket.data.user = session.user;
		socket.data.session = session.session;
		next();
	} catch (err) {
		socket.data.log?.error({ err }, "socket auth failed");
		next(err as ExtendedError);
	}
}
