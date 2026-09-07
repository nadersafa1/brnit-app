import type { FoodUnit } from "@brnit/domain";

import type { MacrosDto } from "./macros";

/**
 * Wire contracts for the member read surface.
 *
 * These shapes are consumed verbatim by the native Home and Stats screens, so
 * field names and optionality are a client contract. Dates cross the wire as
 * ISO strings — `Date` values are serialized by `JSON.stringify` anyway, and
 * typing them as strings keeps the client types honest.
 */

export type { MacrosDto } from "./macros";

/**
 * One line of one meal, resolved for a single date.
 *
 * When a member has swapped the food for this slot, `isOverridden` is true and
 * the `original*` fields carry what the plan originally prescribed, so the UI
 * can show "you swapped X for Y".
 */
export interface CurrentDietPlanMealItemDto {
	foodItemId: string;
	foodName: string;
	gramsPerUnit: number | null;
	isOverridden: boolean;
	macros: MacrosDto;
	mealItemId: string;
	originalFoodItemId?: string;
	originalFoodName?: string;
	originalQuantity?: number;
	originalUnit?: FoodUnit;
	quantity: number;
	unit: FoodUnit;
}

export interface CurrentDietPlanMealDto {
	consumed: boolean;
	/** ISO timestamp of the consumption, present only when `consumed`. */
	consumedAt?: string;
	dietPlanMealId: string;
	macros: MacrosDto;
	mealId: string;
	mealItems: CurrentDietPlanMealItemDto[];
	mealName: string;
	mealOrder: number;
	mealType: string;
	/** Assignment-level override, else the plan slot's own time, else absent. */
	scheduledTime?: string;
}

export interface CurrentDietPlanDayDto {
	date: string;
	macros: MacrosDto;
	meals: CurrentDietPlanMealDto[];
}

export interface CurrentDietPlanAssignmentDto {
	dietPlanId: string;
	endDate: string;
	id: string;
	planName: string;
	startDate: string;
}

export interface CurrentDietPlanPayloadDto {
	assignment: CurrentDietPlanAssignmentDto;
	days: CurrentDietPlanDayDto[];
	plan: {
		description: string | null;
		id: string;
		name: string;
	};
}

/**
 * `{ data: null }` means "nothing to show": no assignment at all, or none
 * overlapping the requested window. The client renders an empty state rather
 * than an error, which is why this is a 200 and not a 404.
 */
export interface CurrentDietPlanDto {
	data: CurrentDietPlanPayloadDto | null;
}

export interface ConsumptionStreakDto {
	streak: number;
}

/** The literal the clients switch on when labelling the leaderboard. */
export const LEADERBOARD_METRIC = "bodyFatPercentPointDrop" as const;

export interface LeaderboardEntryDto {
	endAssessedAt: string;
	endBodyFatPercent: number;
	/** Percentage **points** dropped between the first and last assessment. */
	fatLossPoints: number;
	memberId: string;
	name: string;
	rank: number;
	startAssessedAt: string;
	startBodyFatPercent: number;
}

export interface LeaderboardSelfDto {
	eligibility: "eligible" | "not_enough_assessments";
	endAssessedAt: string | null;
	endBodyFatPercent: number | null;
	fatLossPoints: number | null;
	rank: number | null;
	startAssessedAt: string | null;
	startBodyFatPercent: number | null;
}

export interface OrganizationLeaderboardDto {
	metric: typeof LEADERBOARD_METRIC;
	organization: { id: string; name: string };
	self: LeaderboardSelfDto;
	top: LeaderboardEntryDto[];
}
