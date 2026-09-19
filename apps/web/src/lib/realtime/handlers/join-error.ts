import { joinRoomErrorPayloadSchema, REALTIME_EVENTS } from "@brnit/realtime";
import type { Socket } from "socket.io-client";

import { useRealtimeStore } from "@/stores/realtime-store";

/**
 * `realtime:join-error` — the last room join was refused.
 *
 * The room protocol answers a join only when it fails, so this is the sole
 * signal that a screen is subscribed to nothing. The three codes mean different
 * things and are kept distinct rather than collapsed into "it failed":
 *
 * - `INVALID_ROOM` — the room string matched no builder. A client bug.
 * - `FORBIDDEN` — a valid room the user may not have. Usually a membership lost
 *   mid-session; the socket outlives the `member` row that authorized it.
 * - `PARSE_ERROR` — the join payload itself was malformed. A client bug.
 *
 * None of them is surfaced to the user: a staff screen still renders its data
 * over HTTP, it just stops updating on its own, and an error toast for that
 * would be noise. The code is recorded on the store so a failed join is visible
 * in devtools instead of being silent, and logged once at `warn` for the same
 * reason.
 */
export function registerJoinErrorHandler(socket: Socket): void {
	socket.on(REALTIME_EVENTS.JOIN_ERROR, (raw: unknown) => {
		const parsed = joinRoomErrorPayloadSchema.safeParse(raw);
		if (!parsed.success) {
			return;
		}
		const { code, room } = parsed.data;
		useRealtimeStore.getState().setLastJoinError({ code, room: room ?? null });
		console.warn("realtime: room join refused", { code, room });
	});
}
