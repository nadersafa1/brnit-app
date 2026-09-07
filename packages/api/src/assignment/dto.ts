/**
 * Wire shapes for diet-plan assignments and meal-item overrides.
 *
 * Dates are already `'YYYY-MM-DD'` strings coming out of Drizzle and stay that
 * way; only `timestamp` columns are converted, always with `toISOString()`, so
 * the JSON is byte-identical to what the Next.js handlers produced.
 */

export interface MealTimeOverrideDto {
	dietPlanMealId: string;
	scheduledTime: string;
}

export interface DietPlanAssignmentDto {
	createdAt: string;
	dietPlanId: string;
	endDate: string;
	id: string;
	memberId: string | null;
	startDate: string;
	userId: string | null;
}

/**
 * List and detail reads attach the assignment's **future-only** meal-time
 * overrides (`effective_date IS NULL`) — the nutritionist UI edits exactly those
 * rows, and exact-date rows are a read-path concern of the member Home view.
 */
export interface DietPlanAssignmentWithMealTimesDto
	extends DietPlanAssignmentDto {
	mealTimeOverrides: MealTimeOverrideDto[];
}

/** The member's own assignment list: plan name instead of assignee columns. */
export interface MemberDietPlanAssignmentDto {
	createdAt: string;
	dietPlanId: string;
	endDate: string;
	id: string;
	planName: string;
	startDate: string;
}

export interface MealItemOverrideDto {
	/** Last covered day; `null` only when the set is somehow empty. */
	coverageEndDate: string | null;
	/** First covered day. Together with the end date this is what the native sheet renders. */
	coverageStartDate: string | null;
	createdAt: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
	effectiveDateCount: number;
	effectiveDates: string[];
	foodItemId: string;
	id: string;
	mealItemId: string;
	quantity: number;
	updatedAt: string;
}

/** Every delete in this area answers 200 with this body unless it returns the row. */
export interface DeletedFlagDto {
	deleted: true;
}

interface AssignmentRow {
	createdAt: Date;
	dietPlanId: string;
	endDate: string;
	id: string;
	memberId: string | null;
	startDate: string;
	userId: string | null;
}

interface MemberAssignmentRow {
	createdAt: Date;
	dietPlanId: string;
	endDate: string;
	id: string;
	planName: string;
	startDate: string;
}

interface MealItemOverrideRow {
	createdAt: Date;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
	effectiveDates: string[] | null;
	foodItemId: string;
	id: string;
	mealItemId: string;
	quantity: string;
	updatedAt: Date;
}

export function dietPlanAssignmentToDto(
	row: AssignmentRow
): DietPlanAssignmentDto {
	return {
		createdAt: row.createdAt.toISOString(),
		dietPlanId: row.dietPlanId,
		endDate: row.endDate,
		id: row.id,
		memberId: row.memberId,
		startDate: row.startDate,
		userId: row.userId,
	};
}

export function dietPlanAssignmentWithMealTimesToDto(
	row: AssignmentRow,
	mealTimeOverrides: MealTimeOverrideDto[]
): DietPlanAssignmentWithMealTimesDto {
	return { ...dietPlanAssignmentToDto(row), mealTimeOverrides };
}

export function memberDietPlanAssignmentToDto(
	row: MemberAssignmentRow
): MemberDietPlanAssignmentDto {
	return {
		createdAt: row.createdAt.toISOString(),
		dietPlanId: row.dietPlanId,
		endDate: row.endDate,
		id: row.id,
		planName: row.planName,
		startDate: row.startDate,
	};
}

/**
 * `quantity` is a bare `numeric` column, which Drizzle surfaces as a string; the
 * clients have always received a number here.
 */
export function mealItemOverrideToDto(
	row: MealItemOverrideRow
): MealItemOverrideDto {
	const effectiveDates = row.effectiveDates ?? [];
	return {
		coverageEndDate: effectiveDates.at(-1) ?? null,
		coverageStartDate: effectiveDates[0] ?? null,
		createdAt: row.createdAt.toISOString(),
		dietPlanAssignmentId: row.dietPlanAssignmentId,
		dietPlanMealId: row.dietPlanMealId,
		effectiveDateCount: effectiveDates.length,
		effectiveDates,
		foodItemId: row.foodItemId,
		id: row.id,
		mealItemId: row.mealItemId,
		quantity: Number(row.quantity),
		updatedAt: row.updatedAt.toISOString(),
	};
}
