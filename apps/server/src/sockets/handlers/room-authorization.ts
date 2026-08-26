import {
	isAppAdmin,
	ORGANIZATION_MEMBER_ROLE,
	ORGANIZATION_ROLES,
} from "@brnit/domain";
import type { JoinRoomErrorPayload } from "@brnit/realtime";
import { parseOrganizationRoom, parseUserRoom } from "@brnit/realtime";

/**
 * The pure half of room authorization: everything decidable from the room
 * string and the socket's own identity, with no database access.
 *
 * Split out so the rules can be unit-tested without a Postgres double, and so
 * the one case that genuinely needs a query — organization staff membership —
 * is visible as its own outcome rather than buried in a branch.
 */

/**
 * Every org role except the plain participant. Derived from
 * `ORGANIZATION_ROLES` rather than re-listed, so a new staff role is covered
 * the day it is added instead of silently being denied.
 */
const ORGANIZATION_STAFF_ROLES: readonly string[] = ORGANIZATION_ROLES.filter(
	(role) => role !== ORGANIZATION_MEMBER_ROLE
);

export function isOrganizationStaffRole(
	role: string | null | undefined
): boolean {
	return typeof role === "string" && ORGANIZATION_STAFF_ROLES.includes(role);
}

export type RoomJoinDecision =
	| { kind: "allow" }
	| { kind: "deny"; code: JoinRoomErrorPayload["code"] }
	| { kind: "requires-organization-staff"; organizationId: string };

export interface RoomJoinActor {
	id: string;
	role?: string | null;
}

/**
 * Decides what to do with a join request.
 *
 * Deny by default: a room string matching no known builder is `INVALID_ROOM`,
 * so adding a room shape to `@brnit/realtime` without adding a rule here fails
 * closed rather than open.
 *
 * `user:` rooms are self-only with **no app-admin bypass**. An admin can
 * already read any member's data over the audited HTTP API; a silent live feed
 * is a different thing, and nothing in the product needs it.
 */
export function resolveRoomJoinDecision(
	room: string,
	actor: RoomJoinActor
): RoomJoinDecision {
	const parsedUserRoom = parseUserRoom(room);
	if (parsedUserRoom) {
		// The socket is auto-joined to its own room on connect, so an explicit
		// join is only ever a request for somebody else's.
		return parsedUserRoom.userId === actor.id
			? { kind: "allow" }
			: { kind: "deny", code: "FORBIDDEN" };
	}

	const parsedOrgRoom = parseOrganizationRoom(room);
	if (parsedOrgRoom) {
		return isAppAdmin(actor.role)
			? { kind: "allow" }
			: {
					kind: "requires-organization-staff",
					organizationId: parsedOrgRoom.organizationId,
				};
	}

	return { kind: "deny", code: "INVALID_ROOM" };
}
