import { create } from "zustand";

/**
 * Connection state for the app's single realtime socket.
 *
 * A store rather than React Context on purpose: the socket outlives any one
 * screen, and its state has to be readable from places that have no reason to
 * sit under a provider — which is also why the qpadel pattern this is ported
 * from calls socket-state-in-Context an anti-pattern.
 *
 * The `Socket` instance itself deliberately does **not** live here. qpadel keeps
 * it in the store because its screens join and leave venue rooms; brnit's member
 * app joins nothing — the server auto-joins every socket to `user:<id>` and
 * refuses every other join a member could ask for — so the instance has no
 * consumer outside the hook that owns it.
 */
type RealtimeConnectionStatus =
	| "connected"
	| "connecting"
	| "disconnected"
	| "error";

interface RealtimeState {
	/** Epoch ms of the last domain event that passed schema validation. */
	lastEventAt: number | null;
	status: RealtimeConnectionStatus;
}

interface RealtimeActions {
	setLastEventAt: (lastEventAt: number) => void;
	setStatus: (status: RealtimeConnectionStatus) => void;
}

export const useRealtimeStore = create<RealtimeState & RealtimeActions>(
	(set) => ({
		lastEventAt: null,
		status: "disconnected",

		setLastEventAt: (lastEventAt) => set({ lastEventAt }),
		setStatus: (status) => set({ status }),
	})
);
