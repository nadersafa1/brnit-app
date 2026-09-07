import { z } from "zod";

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Why the member's plan data went stale. All three are *staff* actions — a
 * member's own writes already update their own client optimistically, so
 * echoing them back would only cause redundant refetches.
 */
export const planChangedReasonSchema = z.enum([
	/** An assignment was created, its date range edited, or it was deleted. */
	"assignment_changed",
	/** A meal-time override was written or cleared for one of the plan's slots. */
	"meal_time_changed",
	/** A consumption was logged or removed on the member's behalf. */
	"consumption_changed",
]);

export type PlanChangedReason = z.infer<typeof planChangedReasonSchema>;

/**
 * Emitted to `user:<userId>` when a nutritionist changes what the member's Home
 * screen should show.
 *
 * `dateYmd` is present only when the change is scoped to a single UTC calendar
 * date (a consumption, a dated meal-time override). Home renders one day at a
 * time behind a calendar strip, so a client viewing a different day can skip
 * the refetch. When it is absent the whole visible range is stale.
 */
export const planChangedPayloadSchema = z.object({
	userId: z.string().min(1),
	dietPlanAssignmentId: z.string().min(1),
	reason: planChangedReasonSchema,
	dateYmd: z.string().regex(UTC_DATE_PATTERN).optional(),
});

export type PlanChangedPayload = z.infer<typeof planChangedPayloadSchema>;
