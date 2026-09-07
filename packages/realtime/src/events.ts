/**
 * The complete realtime vocabulary.
 *
 * brnit had no realtime layer before the overhaul, so this list is deliberately
 * short: it names only the two things a client cannot learn on its own, plus
 * the three control messages the room protocol needs. Adding an event here is
 * cheap; removing one after clients ship is not — so nothing speculative lives
 * in this file.
 *
 * Both domain events are **invalidation signals, not data**. They carry just
 * enough to decide *whether* a given screen is stale; the client then refetches
 * through the normal HTTP contract, which is the only place authorization is
 * enforced. That is why no macro totals, meal names or assessment numbers
 * appear in any payload — a socket room is a coarser boundary than an endpoint.
 */
export const REALTIME_EVENTS = {
	/** A member's plan data changed; their Home screen is stale. */
	PLAN_CHANGED: "plan:changed",
	/** A body-composition assessment was recorded; the Stats screen is stale. */
	ASSESSMENT_RECORDED: "assessment:recorded",

	/** Client → server: ask to join a room. */
	JOIN: "realtime:join",
	/** Client → server: leave a room. */
	LEAVE: "realtime:leave",
	/** Server → client: the last join was refused, and why. */
	JOIN_ERROR: "realtime:join-error",
} as const;

export type RealtimeEventName =
	(typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
