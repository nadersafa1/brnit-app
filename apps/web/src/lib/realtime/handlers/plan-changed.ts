import { planChangedPayloadSchema, REALTIME_EVENTS } from "@brnit/realtime";
import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { invalidateDietPlanAssignmentQueries } from "@/lib/api/queries/organization-invalidation";
import { useRealtimeStore } from "@/stores/realtime-store";

/**
 * `plan:changed` — a member's plan data went stale.
 *
 * The server emits this to `user:<userId>` only, so on web it lands on the
 * acting staff member's own socket rather than on an organization feed. It
 * still matters: assignment writes fan out from several screens and from the
 * native app, and this is how a nutritionist's assignment list learns about a
 * change made in the other tab or on the other device.
 *
 * `REALTIME_CLIENT_INVALIDATIONS` gives web the two assignment roots and
 * nothing else — the `diet-plans` / `diet-plan` roots are the plan *template*,
 * which no `plan:changed` reason touches. `invalidateDietPlanAssignmentQueries`
 * is the existing fan-out over exactly those roots.
 *
 * No organization gate here: the payload carries none, and the room it arrives
 * on is already the narrowest one there is.
 */
export function registerPlanChangedHandler(
	socket: Socket,
	queryClient: QueryClient
): void {
	socket.on(REALTIME_EVENTS.PLAN_CHANGED, (raw: unknown) => {
		const parsed = planChangedPayloadSchema.safeParse(raw);
		if (!parsed.success) {
			return;
		}
		useRealtimeStore.getState().setLastEventAt(Date.now());
		invalidateDietPlanAssignmentQueries(queryClient).catch(() => undefined);
	});
}
