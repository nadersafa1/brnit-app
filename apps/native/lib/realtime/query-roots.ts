import { memberKeys } from "@/lib/queries/keys";

/**
 * The React Query key roots realtime events make stale.
 *
 * This is the native half of `REALTIME_CLIENT_INVALIDATIONS` in
 * `@brnit/realtime`: that map is documentation, these are the keys it documents,
 * and the two are meant to be reviewed — and changed — together.
 *
 * The three roots below are spelled out rather than taken from a `memberKeys`
 * factory because `dietPlanAssignments`, `dietPlanMealConsumptions` and
 * `recentAssessments` all append a filter slot, so their zero-argument form is
 * `[…, undefined]` — which React Query's partial matching will not accept as a
 * prefix of `[…, { limit: 5 }]`. `consumptionStreak()`, `currentDietPlanRoot()`
 * and `organizationLeaderboardAll()` already are roots and are used directly at
 * the call sites.
 */
export const dietPlanAssignmentsRoot = [
	...memberKeys.all,
	"diet-plan-assignments",
] as const;

export const dietPlanMealConsumptionsRoot = [
	...memberKeys.all,
	"diet-plan-meal-consumptions",
] as const;

export const recentAssessmentsRoot = [
	...memberKeys.all,
	"recent-assessments",
] as const;
