/**
 * One meal slot on one day, as the mark and unmark flows identify it.
 *
 * `consumedDate` is a `'YYYY-MM-DD'` calendar date in the **device's** timezone
 * — see `lib/date/calendar-date.ts` for why that differs from the server's UTC
 * reckoning, and how the gap is bridged.
 */
export interface ConsumptionSlot {
	consumedDate: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}
