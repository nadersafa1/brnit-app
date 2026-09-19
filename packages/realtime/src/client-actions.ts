/**
 * Reference map: which React Query keys each realtime event should invalidate
 * on clients.
 *
 * Documentation only. Nothing imports this at runtime — invalidation is
 * implemented in each app's own socket handler, against that app's own key
 * factories. This file exists so the server-side emit and the two client-side
 * reactions can be reviewed together, and so a new event cannot ship without
 * someone writing down what it is supposed to make stale.
 *
 * Unlike qpadel's single-client version, the entries are split by app: the two
 * clients do not share a key convention. Native nests everything under one
 * `["member"]` root (`apps/native/lib/queries/keys.ts`), so its roots alone
 * would not discriminate and the prefixes are given in full. Web hard-codes a
 * resource string at index 0 of every key
 * (`apps/web/src/lib/api/query-keys.ts`), and deliberately keeps list and
 * detail under separate roots. Every string below is copied from those two
 * files; `queryClient.invalidateQueries({ queryKey })` treats each as a prefix.
 */
export const REALTIME_CLIENT_INVALIDATIONS = {
	/**
	 * The member's plan data went stale.
	 *
	 * Native gets the whole Home screen: the rendered day
	 * (`currentDietPlanRoot`), the assignment list, the consumption list and the
	 * streak derived from it. The same `["member", "diet-plan-assignments"]`
	 * prefix also covers `mealItemAlternatives`, which nests under it.
	 *
	 * Web is staff-facing, so only the nutritionist's assignment list and detail
	 * are affected. The `"diet-plans"` / `"diet-plan"` roots are the plan
	 * template itself, which no `plan:changed` reason touches.
	 */
	"plan:changed": {
		native: [
			["member", "consumption-streak"],
			["member", "current-diet-plan"],
			["member", "diet-plan-assignments"],
			["member", "diet-plan-meal-consumptions"],
		],
		web: [["diet-plan-assignments"], ["diet-plan-assignment"]],
	},

	/**
	 * A body-composition assessment was recorded.
	 *
	 * The event reaches two rooms and each app reacts to one of them: the member
	 * refetches their Stats screen and the leaderboard a new measurement can
	 * reorder, while staff in `org:<organizationId>` refetch the assessment list
	 * and detail. There is no web leaderboard key — that screen is native-only.
	 */
	"assessment:recorded": {
		native: [
			["member", "organization-leaderboard"],
			["member", "recent-assessments"],
		],
		web: [["body-composition-assessments"], ["body-composition-assessment"]],
	},
} as const;
