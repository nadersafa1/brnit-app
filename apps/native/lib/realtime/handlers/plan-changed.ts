import { planChangedPayloadSchema, REALTIME_EVENTS } from "@brnit/realtime";
import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { addCalendarDays } from "@/lib/date/calendar-date";
import { memberKeys } from "@/lib/queries/keys";
import {
	dietPlanAssignmentsRoot,
	dietPlanMealConsumptionsRoot,
} from "@/lib/realtime/query-roots";
import { useRealtimeStore } from "@/store/realtime-store";

/** Index of the `{ from, to }` slot in `memberKeys.currentDietPlan(...)`. */
const RANGE_SLOT = 2;

interface DateRange {
	from?: string;
	to?: string;
}

function rangeOf(queryKey: QueryKey): DateRange | undefined {
	const slot = queryKey[RANGE_SLOT];
	if (typeof slot !== "object" || slot === null) {
		return;
	}
	return slot as DateRange;
}

/**
 * Whether a `current-diet-plan` query's window can contain `dateYmd`, and so
 * has to be refetched.
 *
 * Home renders one day at a time behind the calendar strip, so a member sitting
 * on last Tuesday has no reason to refetch because today's meal was logged —
 * which is the whole point of `dateYmd` being on the payload.
 *
 * The window is widened by a day at each end because the two dates are reckoned
 * differently: the query's bounds are the **device's** local calendar days
 * (`lib/date/calendar-date.ts`), while `dateYmd` is UTC. Comparing them exactly
 * would silently skip a real change for every member far enough from UTC that
 * the two disagree. A key carrying no range asked for the server's default
 * window, whose bounds are not on the client, so it always refetches.
 */
function coversDate(queryKey: QueryKey, dateYmd: string): boolean {
	const range = rangeOf(queryKey);
	if (!range) {
		return true;
	}
	if (range.from && dateYmd < addCalendarDays(range.from, -1)) {
		return false;
	}
	if (range.to && dateYmd > addCalendarDays(range.to, 1)) {
		return false;
	}
	return true;
}

function invalidatePlanQueries(
	queryClient: QueryClient,
	dateYmd: string | undefined
): void {
	queryClient.invalidateQueries({
		predicate: dateYmd
			? (query: Query) => coversDate(query.queryKey, dateYmd)
			: undefined,
		queryKey: memberKeys.currentDietPlanRoot(),
	});
	queryClient.invalidateQueries({ queryKey: dietPlanAssignmentsRoot });
	queryClient.invalidateQueries({ queryKey: dietPlanMealConsumptionsRoot });
	queryClient.invalidateQueries({ queryKey: memberKeys.consumptionStreak() });
}

/**
 * `plan:changed` → refetch the Home screen.
 *
 * The payload is an invalidation signal, not data: it names no meal and no
 * macro, so there is nothing to patch into the cache and the client re-reads
 * through the HTTP contract, which is where authorization actually lives. The
 * event only ever arrives through the socket's own `user:` room, so there is no
 * recipient check to make here.
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
		invalidatePlanQueries(queryClient, parsed.data.dateYmd);
	});
}
