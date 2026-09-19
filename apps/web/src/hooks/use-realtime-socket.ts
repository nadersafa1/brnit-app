import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { registerAssessmentRecordedHandler } from "@/lib/realtime/handlers/assessment-recorded";
import { registerJoinErrorHandler } from "@/lib/realtime/handlers/join-error";
import { registerPlanChangedHandler } from "@/lib/realtime/handlers/plan-changed";
import { createRealtimeSocket } from "@/lib/realtime/socket-client";
import { useRealtimeStore } from "@/stores/realtime-store";

/**
 * Owns the app's one socket: opens it, registers every handler on it, and
 * publishes it on the store for screen hooks to join rooms through.
 *
 * Called once, from `RealtimeProvider`. Calling it twice would open two
 * connections and leave the second one's socket in the store.
 *
 * The ordering inside the effect is the whole point of the factory's
 * `autoConnect: false`: handlers are attached first and `socket.connect()` is
 * the last statement, so no `connect` can land on a socket that has no
 * listeners yet.
 *
 * `enabled` is how a signed-out visitor stays off the wire. The handshake would
 * be refused anyway — `socketAuth` rejects a connection with no session — but
 * `reconnectionAttempts` would still spend ten failed round-trips finding that
 * out, on every page of the app.
 */
export function useRealtimeSocket(enabled: boolean): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!enabled) {
			const { setSocket, setStatus, socket } = useRealtimeStore.getState();
			socket?.disconnect();
			setSocket(null);
			setStatus("disconnected");
			return;
		}

		const socket = createRealtimeSocket();
		useRealtimeStore.getState().setSocket(socket);
		useRealtimeStore.getState().setStatus("connecting");

		registerAssessmentRecordedHandler(socket, queryClient);
		registerPlanChangedHandler(socket, queryClient);
		registerJoinErrorHandler(socket);

		socket.on("connect", () => {
			useRealtimeStore.getState().setStatus("connected");
			useRealtimeStore.getState().setLastConnectedAt(Date.now());
		});
		socket.on("disconnect", () => {
			useRealtimeStore.getState().setStatus("disconnected");
		});
		socket.on("connect_error", () => {
			useRealtimeStore.getState().setStatus("error");
		});

		socket.connect();

		return () => {
			socket.disconnect();
			useRealtimeStore.getState().setSocket(null);
			useRealtimeStore.getState().setStatus("disconnected");
		};
	}, [enabled, queryClient]);
}
