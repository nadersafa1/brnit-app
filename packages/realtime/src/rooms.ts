/**
 * Room names and their parsers.
 *
 * A room name is the *only* thing a client sends when it asks to subscribe, so
 * every builder here has a matching parser: the server never trusts a raw
 * string, it re-parses it into a typed shape and then authorizes that shape.
 *
 * ## Join authorization (enforced in `apps/server/src/sockets/handlers/join-rooms.handler.ts`)
 *
 * | Room | Who may join |
 * | --- | --- |
 * | `user:<userId>` | that user, and nobody else — not even an app admin |
 * | `org:<organizationId>` | an app admin, or a `member` row in that organization whose `member.role` is **staff** (`owner`, `client_admin`, `direct_admin`, `nutritionist`, `coach`) |
 *
 * Two rules follow from that table and both are deliberate:
 *
 * 1. **`user:` rooms are never joined by request.** The connection handler
 *    joins the socket to its own user room automatically, and an explicit join
 *    of `user:<someone-else>` is refused. There is no legitimate reason for one
 *    session to watch another's Home screen, so the check is a plain string
 *    comparison with no database round-trip and no admin escape hatch.
 * 2. **Plain org `member`s cannot join `org:` rooms.** A member's own updates
 *    reach them through their `user:` room. Letting them into the org room
 *    would leak the *timing and volume* of every other member's assessments,
 *    which the HTTP contract does not expose to them.
 *
 * `org:` membership is re-checked on every join because a socket outlives the
 * membership that authorized it — a session can stay open long after the
 * `member` row is deleted or demoted.
 */

const USER_ROOM_PREFIX = "user:";
const ORGANIZATION_ROOM_PREFIX = "org:";

/** Private room for one signed-in user. Auto-joined on connect. */
export function userRoom(userId: string): string {
	return `${USER_ROOM_PREFIX}${userId}`;
}

/** Staff-only room for one organization. */
export function organizationRoom(organizationId: string): string {
	return `${ORGANIZATION_ROOM_PREFIX}${organizationId}`;
}

export interface ParsedUserRoom {
	userId: string;
}

export interface ParsedOrganizationRoom {
	organizationId: string;
}

/**
 * `user:<userId>` → `{ userId }`, or `null` when the string is not a user room.
 *
 * Ids are better-auth text ids and may themselves contain a `:`, so everything
 * after the prefix is taken verbatim rather than split on the separator.
 */
export function parseUserRoom(room: string): ParsedUserRoom | null {
	if (!room.startsWith(USER_ROOM_PREFIX)) {
		return null;
	}
	const userId = room.slice(USER_ROOM_PREFIX.length);
	if (!userId) {
		return null;
	}
	return { userId };
}

/** `org:<organizationId>` → `{ organizationId }`, or `null`. */
export function parseOrganizationRoom(
	room: string
): ParsedOrganizationRoom | null {
	if (!room.startsWith(ORGANIZATION_ROOM_PREFIX)) {
		return null;
	}
	const organizationId = room.slice(ORGANIZATION_ROOM_PREFIX.length);
	if (!organizationId) {
		return null;
	}
	return { organizationId };
}
