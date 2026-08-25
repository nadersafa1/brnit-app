import {
	addDaysUTC,
	diffDaysInclusiveUTC,
	expandDateRangeInclusive,
	getTodayUtcDateString,
} from "@brnit/datetime";
import { db } from "@brnit/db";
import {
	dietPlan,
	dietPlanAssignment,
	dietPlanMeal,
	dietPlanMealConsumption,
	dietPlanMealItemOverride,
	dietPlanMealTimeOverride,
	foodItem,
	meal,
	mealItem,
} from "@brnit/db/schema";
import {
	DEFAULT_FOOD_UNIT,
	type FoodUnit,
	isFoodUnit,
	type MealTimeOverrideRow,
	overrideSlotKey,
	resolveMealTimeOverridesForDate,
	resolveOverridesForDate,
} from "@brnit/domain";
import { asc, eq, inArray } from "drizzle-orm";

import { combineConditions } from "../db/query-conditions";
import type {
	CurrentDietPlanDayDto,
	CurrentDietPlanDto,
	CurrentDietPlanMealDto,
	CurrentDietPlanMealItemDto,
} from "./dto";
import { type FoodNutrition, macrosForQuantity, sumMacros } from "./macros";
import { assignmentAssigneeCondition, getUserMemberIds } from "./member-access";
import type { CurrentDietPlanInput } from "./schemas";

/**
 * `GET /member/me/current-diet-plan` — the core member read.
 *
 * Everything is loaded in batches up front and assembled in memory: one query
 * for the plan slots, one for their meal lines, one for the assignment's
 * overrides, one for its meal-time overrides, one for the window's
 * consumptions and one for every referenced food. Day assembly is then pure,
 * which is what keeps a 31-day window from turning into a per-day N+1.
 */

/** Default window length when `?to` is omitted: today plus six days. */
const DEFAULT_RANGE_DAYS = 6;

export interface FoodDetails {
	gramsPerUnit: number | null;
	nutrition: FoodNutrition;
	unit: FoodUnit;
}

/** A food row that no longer exists contributes zeros, measured in grams. */
const MISSING_FOOD_DETAILS: FoodDetails = {
	gramsPerUnit: null,
	nutrition: { calories: 0, carbs: 0, fat: 0, protein: 0 },
	unit: DEFAULT_FOOD_UNIT,
};

export interface PlanSlotItem {
	foodItemId: string;
	foodName: string;
	mealItemId: string;
	quantity: number;
}

export interface PlanSlot {
	dayNumber: number;
	id: string;
	mealId: string;
	mealItems: PlanSlotItem[];
	mealName: string;
	mealOrder: number;
	mealType: string;
	scheduledTime: string | null;
}

/** An override row enriched with the swapped-in food's name. */
export interface OverrideSlotRow {
	dietPlanMealId: string;
	effectiveDates: readonly string[];
	foodItemId: string;
	foodName: string;
	mealItemId: string;
	quantity: number;
	updatedAt: Date;
}

interface AssignmentRow {
	description: string | null;
	dietPlanId: string;
	endDate: string;
	id: string;
	planName: string;
	startDate: string;
}

function toFiniteNumber(value: string | null | undefined): number {
	if (value === null || value === undefined || value === "") {
		return 0;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string | null): number | null {
	if (value === null) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** `effective_dates` is `jsonb`; anything that is not a string is ignored. */
function parseEffectiveDates(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === "string");
}

/** Every assignment visible to the user, oldest start date first. */
async function listAssignmentsForUser(
	userId: string
): Promise<AssignmentRow[]> {
	const memberIds = await getUserMemberIds(userId);
	return await db
		.select({
			description: dietPlan.description,
			dietPlanId: dietPlanAssignment.dietPlanId,
			endDate: dietPlanAssignment.endDate,
			id: dietPlanAssignment.id,
			planName: dietPlan.name,
			startDate: dietPlanAssignment.startDate,
		})
		.from(dietPlanAssignment)
		.innerJoin(dietPlan, eq(dietPlanAssignment.dietPlanId, dietPlan.id))
		.where(assignmentAssigneeCondition(userId, memberIds))
		.orderBy(asc(dietPlanAssignment.startDate));
}

/**
 * The assignment covering `from`, else the first one.
 *
 * A person has at most one plan per day org-wide (the overlap check on write
 * guarantees it), so "covering `from`" resolves to exactly one row whenever
 * the window starts inside a plan.
 */
function pickAssignmentForDate(
	assignments: readonly AssignmentRow[],
	from: string
): AssignmentRow | undefined {
	return (
		assignments.find(
			(row) => row.startDate <= from && row.endDate >= from
		) ?? assignments[0]
	);
}

/** Plan slots with their meal lines, batched into two queries. */
async function loadPlanSlots(dietPlanId: string): Promise<PlanSlot[]> {
	const slotRows = await db
		.select({
			dayNumber: dietPlanMeal.dayNumber,
			id: dietPlanMeal.id,
			mealId: dietPlanMeal.mealId,
			mealName: meal.name,
			mealOrder: dietPlanMeal.mealOrder,
			mealType: dietPlanMeal.mealType,
			scheduledTime: dietPlanMeal.scheduledTime,
		})
		.from(dietPlanMeal)
		.innerJoin(meal, eq(dietPlanMeal.mealId, meal.id))
		.where(eq(dietPlanMeal.dietPlanId, dietPlanId))
		.orderBy(
			asc(dietPlanMeal.dayNumber),
			asc(dietPlanMeal.mealType),
			asc(dietPlanMeal.mealOrder)
		);

	const mealIds = [...new Set(slotRows.map((row) => row.mealId))];
	const itemsByMealId = new Map<string, PlanSlotItem[]>();

	if (mealIds.length > 0) {
		// One query for every line of every meal in the plan, grouped in memory.
		const itemRows = await db
			.select({
				foodItemId: mealItem.foodItemId,
				foodName: foodItem.name,
				mealId: mealItem.mealId,
				mealItemId: mealItem.id,
				quantity: mealItem.quantity,
			})
			.from(mealItem)
			.innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
			.where(inArray(mealItem.mealId, mealIds));

		for (const row of itemRows) {
			const items = itemsByMealId.get(row.mealId) ?? [];
			items.push({
				foodItemId: row.foodItemId,
				foodName: row.foodName,
				mealItemId: row.mealItemId,
				quantity: toFiniteNumber(row.quantity),
			});
			itemsByMealId.set(row.mealId, items);
		}
	}

	return slotRows.map((row) => ({
		...row,
		mealItems: itemsByMealId.get(row.mealId) ?? [],
	}));
}

async function loadOverrides(assignmentId: string): Promise<OverrideSlotRow[]> {
	const rows = await db
		.select({
			dietPlanMealId: dietPlanMealItemOverride.dietPlanMealId,
			effectiveDates: dietPlanMealItemOverride.effectiveDates,
			foodItemId: dietPlanMealItemOverride.foodItemId,
			foodName: foodItem.name,
			mealItemId: dietPlanMealItemOverride.mealItemId,
			quantity: dietPlanMealItemOverride.quantity,
			updatedAt: dietPlanMealItemOverride.updatedAt,
		})
		.from(dietPlanMealItemOverride)
		.innerJoin(foodItem, eq(dietPlanMealItemOverride.foodItemId, foodItem.id))
		.where(eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId));

	return rows.map((row) => ({
		...row,
		effectiveDates: parseEffectiveDates(row.effectiveDates),
		quantity: toFiniteNumber(row.quantity),
	}));
}

async function loadMealTimeOverrides(
	assignmentId: string
): Promise<MealTimeOverrideRow[]> {
	return await db
		.select({
			dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
			effectiveDate: dietPlanMealTimeOverride.effectiveDate,
			scheduledTime: dietPlanMealTimeOverride.scheduledTime,
		})
		.from(dietPlanMealTimeOverride)
		.where(eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId));
}

/** Nutrition, unit and grams-per-unit for every referenced food, in one query. */
async function loadFoodDetails(
	foodItemIds: readonly string[]
): Promise<Map<string, FoodDetails>> {
	const details = new Map<string, FoodDetails>();
	if (foodItemIds.length === 0) {
		return details;
	}

	const rows = await db
		.select({
			calories: foodItem.calories,
			carbs: foodItem.carbs,
			fat: foodItem.fat,
			gramsPerUnit: foodItem.gramsPerUnit,
			id: foodItem.id,
			protein: foodItem.protein,
			unit: foodItem.unit,
		})
		.from(foodItem)
		.where(inArray(foodItem.id, [...foodItemIds]));

	for (const row of rows) {
		details.set(row.id, {
			gramsPerUnit: toNullableNumber(row.gramsPerUnit),
			nutrition: {
				calories: toFiniteNumber(row.calories),
				carbs: toFiniteNumber(row.carbs),
				fat: toFiniteNumber(row.fat),
				protein: toFiniteNumber(row.protein),
			},
			unit: isFoodUnit(row.unit) ? row.unit : DEFAULT_FOOD_UNIT,
		});
	}
	return details;
}

/** `${dietPlanMealId}:${date}` → the consumption's ISO timestamp. */
async function loadConsumptions(
	assignmentId: string,
	dates: readonly string[]
): Promise<Map<string, string>> {
	const rows = await db
		.select({
			consumedAt: dietPlanMealConsumption.consumedAt,
			consumedDate: dietPlanMealConsumption.consumedDate,
			dietPlanMealId: dietPlanMealConsumption.dietPlanMealId,
		})
		.from(dietPlanMealConsumption)
		.where(
			combineConditions([
				eq(dietPlanMealConsumption.dietPlanAssignmentId, assignmentId),
				inArray(dietPlanMealConsumption.consumedDate, [...dates]),
			])
		);

	const consumptions = new Map<string, string>();
	for (const row of rows) {
		consumptions.set(
			`${row.dietPlanMealId}:${row.consumedDate}`,
			row.consumedAt.toISOString()
		);
	}
	return consumptions;
}

function collectFoodItemIds(
	slots: readonly PlanSlot[],
	overrides: readonly OverrideSlotRow[]
): string[] {
	const ids = new Set<string>();
	for (const slot of slots) {
		for (const item of slot.mealItems) {
			ids.add(item.foodItemId);
		}
	}
	for (const override of overrides) {
		ids.add(override.foodItemId);
	}
	return [...ids];
}

/**
 * Slot order within a day: `mealOrder`, then `mealType` lexicographically,
 * then `id` as a total-order tiebreak so the response is stable.
 */
function compareSlots(left: PlanSlot, right: PlanSlot): number {
	const byOrder = left.mealOrder - right.mealOrder;
	if (byOrder !== 0) {
		return byOrder;
	}
	const byType = left.mealType.localeCompare(right.mealType);
	if (byType !== 0) {
		return byType;
	}
	return left.id.localeCompare(right.id);
}

function buildMealItem(
	item: PlanSlotItem,
	override: OverrideSlotRow | undefined,
	foodDetails: ReadonlyMap<string, FoodDetails>
): CurrentDietPlanMealItemDto {
	const foodItemId = override?.foodItemId ?? item.foodItemId;
	const quantity = override?.quantity ?? item.quantity;
	const details = foodDetails.get(foodItemId) ?? MISSING_FOOD_DETAILS;
	const macros = macrosForQuantity(quantity, details.nutrition, details.unit);

	if (!override) {
		return {
			foodItemId: item.foodItemId,
			foodName: item.foodName,
			gramsPerUnit: details.gramsPerUnit,
			isOverridden: false,
			macros,
			mealItemId: item.mealItemId,
			quantity: item.quantity,
			unit: details.unit,
		};
	}

	const originalDetails =
		foodDetails.get(item.foodItemId) ?? MISSING_FOOD_DETAILS;
	return {
		foodItemId: override.foodItemId,
		foodName: override.foodName,
		gramsPerUnit: details.gramsPerUnit,
		isOverridden: true,
		macros,
		mealItemId: item.mealItemId,
		originalFoodItemId: item.foodItemId,
		originalFoodName: item.foodName,
		originalQuantity: item.quantity,
		originalUnit: originalDetails.unit,
		quantity: override.quantity,
		unit: details.unit,
	};
}

export interface BuildCurrentDietPlanDaysInput {
	allDates: readonly string[];
	/** `${dietPlanMealId}:${date}` → ISO `consumedAt`. */
	consumptions: ReadonlyMap<string, string>;
	foodDetails: ReadonlyMap<string, FoodDetails>;
	mealTimeOverrides: readonly MealTimeOverrideRow[];
	overrides: readonly OverrideSlotRow[];
	slots: readonly PlanSlot[];
	startDate: string;
}

/**
 * Assembles the response days. Pure — every row it needs is already loaded,
 * which is what makes the whole read testable without a database.
 */
export function buildCurrentDietPlanDays(
	input: BuildCurrentDietPlanDaysInput
): CurrentDietPlanDayDto[] {
	const {
		allDates,
		consumptions,
		foodDetails,
		mealTimeOverrides,
		overrides,
		slots,
		startDate,
	} = input;

	return allDates.map((date) => {
		// Day 1 is the assignment's start date, hence the inclusive diff.
		const planDay = diffDaysInclusiveUTC(startDate, date);
		const resolvedOverrides = resolveOverridesForDate(overrides, date);
		const resolvedMealTimes = resolveMealTimeOverridesForDate(
			mealTimeOverrides,
			date
		);

		const meals = slots
			// `dayNumber === 0` repeats on every day of the plan.
			.filter((slot) => slot.dayNumber === 0 || slot.dayNumber === planDay)
			.sort(compareSlots)
			.map<CurrentDietPlanMealDto>((slot) => {
				const consumedAt = consumptions.get(`${slot.id}:${date}`);
				const mealItems = slot.mealItems.map((item) =>
					buildMealItem(
						item,
						resolvedOverrides.get(overrideSlotKey(slot.id, item.mealItemId)),
						foodDetails
					)
				);
				const scheduledTime =
					resolvedMealTimes.get(slot.id) ?? slot.scheduledTime ?? undefined;

				return {
					consumed: consumedAt !== undefined,
					...(consumedAt === undefined ? {} : { consumedAt }),
					dietPlanMealId: slot.id,
					macros: sumMacros(mealItems.map((entry) => entry.macros)),
					mealId: slot.mealId,
					mealItems,
					mealName: slot.mealName,
					mealOrder: slot.mealOrder,
					mealType: slot.mealType,
					...(scheduledTime === undefined ? {} : { scheduledTime }),
				};
			});

		return {
			date,
			macros: sumMacros(meals.map((entry) => entry.macros)),
			meals,
		};
	});
}

/**
 * The dates in `[from..to]` that also fall inside the assignment window.
 * Empty means the requested window does not overlap the plan at all.
 */
export function resolveWindowDates(
	from: string,
	to: string,
	assignment: { endDate: string; startDate: string }
): string[] {
	return expandDateRangeInclusive(from, to).filter(
		(date) => date >= assignment.startDate && date <= assignment.endDate
	);
}

export async function loadCurrentDietPlan(
	userId: string,
	input: CurrentDietPlanInput
): Promise<CurrentDietPlanDto> {
	const from = input.from ?? getTodayUtcDateString();
	const to = input.to ?? addDaysUTC(from, DEFAULT_RANGE_DAYS);

	const assignments = await listAssignmentsForUser(userId);
	const assignment = pickAssignmentForDate(assignments, from);
	if (!assignment) {
		return { data: null };
	}

	const allDates = resolveWindowDates(from, to, assignment);
	if (allDates.length === 0) {
		return { data: null };
	}

	// Independent reads; none of the three depends on another's result.
	const [slots, overrides, mealTimeOverrides] = await Promise.all([
		loadPlanSlots(assignment.dietPlanId),
		loadOverrides(assignment.id),
		loadMealTimeOverrides(assignment.id),
	]);

	const [consumptions, foodDetails] = await Promise.all([
		loadConsumptions(assignment.id, allDates),
		loadFoodDetails(collectFoodItemIds(slots, overrides)),
	]);

	return {
		data: {
			assignment: {
				dietPlanId: assignment.dietPlanId,
				endDate: assignment.endDate,
				id: assignment.id,
				planName: assignment.planName,
				startDate: assignment.startDate,
			},
			days: buildCurrentDietPlanDays({
				allDates,
				consumptions,
				foodDetails,
				mealTimeOverrides,
				overrides,
				slots,
				startDate: assignment.startDate,
			}),
			plan: {
				description: assignment.description,
				id: assignment.dietPlanId,
				name: assignment.planName,
			},
		},
	};
}
