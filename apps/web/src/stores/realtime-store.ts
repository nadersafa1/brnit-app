import type { JoinRoomErrorPayload } from "@brnit/realtime";
import type { Socket } from "socket.io-client";
import { create } from "zustand";

/**
 * Connection state for the app's single realtime socket.
 *
 * A store rather than a React Context, deliberately. The socket instance is
 * read from three places that are not in one subtree — the provider that owns
 * it, the screen hooks that join rooms, and the event handlers, which are plain
 * functions with no component to hang a `useContext` off. Handlers reach this
 * through `useRealtimeStore.getState()`, which a Context cannot offer at all.
 *
 * Sits alongside `network-store.ts` and follows it: a `create()` call with the
 * state, and no logic beyond setters.
 */

export type RealtimeConnectionStatus =
	| "connected"
	| "connecting"
	| "disconnected"
	| "error";

export interface RealtimeJoinError {
	code: JoinRoomErrorPayload["code"];
	room: string | null;
}

interface RealtimeState {
	/**
	 * The organization whose room a screen currently holds, or `null` when no
	 * organization-scoped screen is mounted.
	 *
	 * Handlers use it to drop events for a different organization. A socket can
	 * legitimately be in more than one room at once — every socket is in its own
	 * `user:` room, and an `assessment:recorded` reaches both — so "it arrived"
	 * is not the same as "this screen cares". `null` means no screen has claimed
	 * an organization, and events pass through rather than being dropped.
	 */
	activeOrganizationId: string | null;
	lastConnectedAt: number | null;
	lastEventAt: number | null;
	/** The most recent `realtime:join-error`, so a failed join is diagnosable. */
	lastJoinError: RealtimeJoinError | null;
	setActiveOrganizationId: (organizationId: string | null) => void;
	setLastConnectedAt: (value: number | null) => void;
	setLastEventAt: (value: number) => void;
	setLastJoinError: (error: RealtimeJoinError | null) => void;
	setSocket: (socket: Socket | null) => void;
	setStatus: (status: RealtimeConnectionStatus) => void;
	socket: Socket | null;
	status: RealtimeConnectionStatus;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
	activeOrganizationId: null,
	lastConnectedAt: null,
	lastEventAt: null,
	lastJoinError: null,
	socket: null,
	status: "disconnected",
	setActiveOrganizationId: (activeOrganizationId) =>
		set({ activeOrganizationId }),
	setLastConnectedAt: (lastConnectedAt) => set({ lastConnectedAt }),
	setLastEventAt: (lastEventAt) => set({ lastEventAt }),
	setLastJoinError: (lastJoinError) => set({ lastJoinError }),
	setSocket: (socket) => set({ socket }),
	setStatus: (status) => set({ status }),
}));
