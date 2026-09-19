import {
	assessmentRecordedPayloadSchema,
	REALTIME_EVENTS,
} from "@brnit/realtime";
import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { invalidateAssessmentQueries } from "@/lib/api/invalidate-assessment-queries";
import { useRealtimeStore } from "@/stores/realtime-store";

/**
 * `assessment:recorded` — a direct admin wrote a body-composition reading.
 *
 * Web reaches this event through `org:<organizationId>`, which a staff screen
 * joins explicitly. `REALTIME_CLIENT_INVALIDATIONS` names
 * `["body-composition-assessments"]` and `["body-composition-assessment"]` as
 * the web roots, and `invalidateAssessmentQueries` is already the fan-out over
 * exactly those two — reused here rather than re-derived, so the socket path
 * and the mutation path cannot drift apart.
 *
 * The payload is re-validated on receive even though the server validated it on
 * emit: a client that trusts the wire has no way to tell a contract change from
 * a malformed frame, and the cost of being wrong is a crash inside a socket
 * callback, where there is no error boundary.
 */
export function registerAssessmentRecordedHandler(
	socket: Socket,
	queryClient: QueryClient
): void {
	socket.on(REALTIME_EVENTS.ASSESSMENT_RECORDED, (raw: unknown) => {
		const parsed = assessmentRecordedPayloadSchema.safeParse(raw);
		if (!parsed.success) {
			return;
		}

		// The same event also reaches the actor's own `user:` room, so a staff
		// member who is themselves assessed elsewhere would otherwise refetch a
		// list that cannot contain the new row. Only drop when a screen has
		// actually claimed an organization — `null` means nothing to compare to.
		const { activeOrganizationId } = useRealtimeStore.getState();
		if (
			activeOrganizationId !== null &&
			activeOrganizationId !== parsed.data.organizationId
		) {
			return;
		}

		useRealtimeStore.getState().setLastEventAt(Date.now());
		invalidateAssessmentQueries(queryClient).catch(() => undefined);
	});
}
