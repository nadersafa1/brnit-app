import { db } from "@brnit/db";
import { member } from "@brnit/db/schema";
import type { JoinRoomErrorPayload } from "@brnit/realtime";
import { joinRoomPayloadSchema, REALTIME_EVENTS } from "@brnit/realtime";
import { and, eq } from "drizzle-orm";
import type { AppServer, AppSocket } from "../socket-types.js";

import {
	isOrganizationStaffRole,
	resolveRoomJoinDecision,
} from "./room-authorization.js";

/**
 * Server-side room authorization.
 *
 * The rules are documented in `@brnit/realtime`'s `rooms.ts` and decided by
 * `resolveRoomJoinDecision`; this file adds the one thing that needs the
 * database — organization staff membership — and the socket plumbing.
 *
 * Membership is re-checked on **every** join, not cached on the socket: a
 * connection authenticated at handshake can live for hours, and a `member` row
 * can be deleted or demoted in between.
 */

/**
 * `member` has no unique constraint on `(organization_id, user_id)` — see
 * `docs/migration/data-layer.md` §1.6 — so a user can legitimately have more
 * than one row here. Any staff row grants access.
 */
async function isOrganizationStaff(
	userId: string,
	organizationId: string
): Promise<boolean> {
	const rows = await db
		.select({ role: member.role })
		.from(member)
		.where(
			and(eq(member.userId, userId), eq(member.organizationId, organizationId))
		);
	return rows.some((row) => isOrganizationStaffRole(row.role));
}

function emitJoinError(
	socket: AppSocket,
	code: JoinRoomErrorPayload["code"],
	room?: string
): void {
	socket.emit(REALTIME_EVENTS.JOIN_ERROR, { code, room });
}

async function authorizeRoomJoin(
	socket: AppSocket,
	room: string
): Promise<boolean> {
	const decision = resolveRoomJoinDecision(room, socket.data.user);

	if (decision.kind === "allow") {
		return true;
	}
	if (decision.kind === "deny") {
		emitJoinError(socket, decision.code, room);
		return false;
	}

	const allowed = await isOrganizationStaff(
		socket.data.user.id,
		decision.organizationId
	);
	if (!allowed) {
		emitJoinError(socket, "FORBIDDEN", room);
	}
	return allowed;
}

export function registerJoinRoomsHandler(io: AppServer): void {
	io.on("connection", (socket) => {
		socket.on(REALTIME_EVENTS.JOIN, async (raw: unknown) => {
			const parsed = joinRoomPayloadSchema.safeParse(raw);
			if (!parsed.success) {
				emitJoinError(socket, "PARSE_ERROR");
				return;
			}

			try {
				if (!(await authorizeRoomJoin(socket, parsed.data.room))) {
					return;
				}
				await socket.join(parsed.data.room);
				socket.data.log.info(
					{ room: parsed.data.room, userId: socket.data.user.id },
					"ws joined room"
				);
			} catch (error: unknown) {
				// A failed authorization *query* must never read as "allowed" — the
				// client sees the same refusal a denial produces.
				socket.data.log.error(
					{ err: error, room: parsed.data.room },
					"ws failed to join room"
				);
				emitJoinError(socket, "FORBIDDEN", parsed.data.room);
			}
		});

		socket.on(REALTIME_EVENTS.LEAVE, async (raw: unknown) => {
			const parsed = joinRoomPayloadSchema.safeParse(raw);
			if (!parsed.success) {
				return;
			}
			// Leaving needs no authorization: a socket can only leave rooms it is
			// already in, and `socket.leave` is a no-op otherwise.
			await socket.leave(parsed.data.room);
		});
	});
}
