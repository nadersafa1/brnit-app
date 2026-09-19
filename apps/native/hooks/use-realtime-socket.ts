import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { memberKeys } from "@/lib/queries/keys";
import { registerAssessmentRecordedHandler } from "@/lib/realtime/handlers/assessment-recorded";
import { registerPlanChangedHandler } from "@/lib/realtime/handlers/plan-changed";
import { createRealtimeSocket } from "@/lib/realtime/socket-client";
import { useRealtimeStore } from "@/store/realtime-store";

/**
 * Owns the app's one realtime socket for as long as somebody is signed in.
 *
 * Gated on the session in both directions: an unauthenticated handshake is
 * refused outright by the server, and a socket left open after sign-out would
 * keep invalidating queries for a user who is gone. The effect keys on the user
 * id, so switching accounts tears the old socket down and opens a new one with
 * the new session cookie.
 *
 * Handlers are registered **before** `connect()` — `createRealtimeSocket`
 * returns an unconnected socket for exactly this reason — so no event can land
 * in the gap between opening the connection and being ready to act on one.
 */
export function useRealtimeSocket(): void {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const userId = session?.user.id;

	useEffect(() => {
		if (!userId) {
			useRealtimeStore.getState().setStatus("disconnected");
			return;
		}

		const socket = createRealtimeSocket();
		registerPlanChangedHandler(socket, queryClient);
		registerAssessmentRecordedHandler(socket, queryClient);

		let hasConnectedBefore = false;
		socket.on("connect", () => {
			useRealtimeStore.getState().setStatus("connected");
			if (hasConnectedBefore) {
				// Nothing is replayed after a drop, so whatever changed while the
				// socket was down is only visible once the member's data is refetched.
				queryClient.invalidateQueries({ queryKey: memberKeys.all });
			}
			hasConnectedBefore = true;
		});
		socket.on("disconnect", () => {
			useRealtimeStore.getState().setStatus("disconnected");
		});
		socket.on("connect_error", (error) => {
			useRealtimeStore.getState().setStatus("error");
			// Logged rather than surfaced: realtime is an accelerant, and every
			// screen still loads and refreshes over HTTP without it.
			//
			// `warn`, not `error`. socket.io retries on its own, so this fires
			// routinely and harmlessly — an API deploy, a tunnel blip, a laptop
			// waking up — and `console.error` red-boxes the LogBox overlay in dev
			// every single time. Reserving red for things a developer must act on
			// is what keeps it meaningful.
			console.warn("[Realtime] Socket connection failed:", error.message);
		});

		useRealtimeStore.getState().setStatus("connecting");
		socket.connect();

		return () => {
			socket.removeAllListeners();
			socket.disconnect();
			useRealtimeStore.getState().setStatus("disconnected");
		};
	}, [queryClient, userId]);
}
