import { organizationRoom } from "@brnit/realtime";
import { useEffect } from "react";

import {
	joinRealtimeRoom,
	leaveRealtimeRoom,
} from "@/lib/realtime/socket-client";
import { useRealtimeStore } from "@/stores/realtime-store";

/**
 * Subscribes a staff screen to its organization's realtime room.
 *
 * `org:<organizationId>` is the one room web has to ask for. The `user:` room
 * every socket already sits in is joined by the server on connect, but the
 * organization room is staff-only and re-authorized against the `member` table
 * on every join, so it is never granted implicitly — a screen has to claim it
 * and give it back.
 *
 * Two effects, because the two concerns have different lifetimes: the store's
 * `activeOrganizationId` is what lets a handler drop an event for another
 * organization and must be set even before the socket exists, while the join
 * can only happen once it does.
 *
 * The join is where the ordering bites. A screen usually mounts on a socket
 * that is already connected, but the very first screen after sign-in mounts
 * during the handshake, and an emit on a disconnected socket is dropped
 * silently rather than buffered into the join. So: join now if connected,
 * otherwise once on `connect`. Cleanup has to undo both halves — remove the
 * pending listener *and* leave, but only while still connected, since leaving a
 * socket that is already gone is at best a no-op and at worst a re-open.
 */
export function useOrganizationRealtime(
	organizationId: string | null,
	enabled = true
): void {
	const socket = useRealtimeStore((state) => state.socket);
	const setActiveOrganizationId = useRealtimeStore(
		(state) => state.setActiveOrganizationId
	);

	useEffect(() => {
		setActiveOrganizationId(enabled ? organizationId : null);
		return () => {
			setActiveOrganizationId(null);
		};
	}, [enabled, organizationId, setActiveOrganizationId]);

	useEffect(() => {
		if (!(enabled && organizationId && socket)) {
			return;
		}

		const room = organizationRoom(organizationId);
		const join = () => {
			joinRealtimeRoom(socket, room);
		};

		if (socket.connected) {
			join();
		} else {
			socket.once("connect", join);
		}

		return () => {
			socket.off("connect", join);
			if (socket.connected) {
				leaveRealtimeRoom(socket, room);
			}
		};
	}, [enabled, organizationId, socket]);
}
