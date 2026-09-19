import {
	assessmentRecordedPayloadSchema,
	REALTIME_EVENTS,
} from "@brnit/realtime";
import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { memberKeys } from "@/lib/queries/keys";
import { recentAssessmentsRoot } from "@/lib/realtime/query-roots";
import { useRealtimeStore } from "@/store/realtime-store";

/**
 * `assessment:recorded` → refetch the Stats screen.
 *
 * The member's own list of recent assessments, plus the organization
 * leaderboard, which a single new measurement can reorder underneath them. The
 * payload carries no measurement values by design, so both are plain refetches.
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
		useRealtimeStore.getState().setLastEventAt(Date.now());
		queryClient.invalidateQueries({ queryKey: recentAssessmentsRoot });
		queryClient.invalidateQueries({
			queryKey: memberKeys.organizationLeaderboardAll(),
		});
	});
}
