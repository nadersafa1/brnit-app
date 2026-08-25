import { type DbTransaction, db } from "@brnit/db";
import {
	dietPlan,
	dietPlanAssignment,
	dietPlanMeal,
	foodItem,
	meal,
	mealItem,
} from "@brnit/db/schema";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";

import type { Context } from "../context";
import { combineConditions } from "../db/query-conditions";
import { assertCanManageDietPlans } from "../diet-plan/access";
import {
	assertDietPlanDeletable,
	assertDietPlanEditable,
	assertNoDietPlanMealRemoveUpdateOverlap,
	assertScheduledMealIdsExist,
	assertSlotIdsBelongToPlan,
} from "../diet-plan/conflicts";
import {
	type DietPlanDetailDto,
	type DietPlanDto,
	type DietPlanListItemDto,
	dietPlanToDetailDto,
	dietPlanToDto,
	dietPlanToListItemDto,
} from "../diet-plan/dto";
import type {
	CreateDietPlanInput,
	DeleteDietPlanInput,
	GetDietPlanInput,
	ListDietPlansInput,
	UpdateDietPlanInput,
	UpdateDietPlanMealInput,
} from "../diet-plan/schemas";
import { HttpError } from "../http-error";
import { uniqueIds } from "../meal/mutation-ids";
import {
	calculateOffset,
	createPaginatedResponse,
	type PaginatedResponse,
} from "../pagination/offset";

/**
 * Diet-plan handlers. Like meals, they are mounted unchanged under both
 * `/admin/diet-plans` and `/nutritionist/diet-plans` and re-assert
 * authorization themselves.
 *
 * A plan is a header plus `diet_plan_meal` slots. A slot with `dayNumber = 0`
 * repeats on every day of an assignment; `>= 1` pins it to that day. Several
 * slots may share `(dayNumber, mealType, mealOrder)` — that is how a plan
 * offers alternatives for one meal.
 */

const DIET_PLAN_NOT_FOUND = "Diet plan not found";

const dietPlanColumns = {
	createdAt: dietPlan.createdAt,
	description: dietPlan.description,
	id: dietPlan.id,
	name: dietPlan.name,
	updatedAt: dietPlan.updatedAt,
};

const DIET_PLAN_SORT_COLUMNS = {
	createdAt: dietPlan.createdAt,
	name: dietPlan.name,
} as const;

/**
 * True when the plan has at least one member or user assignment.
 *
 * Takes the transaction handle, never the singleton: both callers need the
 * probe and the mutation to be atomic, or an assignment created between the two
 * would slip past the lock.
 */
async function dietPlanHasAssignments(
	tx: DbTransaction,
	planId: string
): Promise<boolean> {
	const rows = await tx
		.select({ id: dietPlanAssignment.id })
		.from(dietPlanAssignment)
		.where(eq(dietPlanAssignment.dietPlanId, planId))
		.limit(1);
	return rows[0] != null;
}

export async function listDietPlans(
	ctx: Context,
	input: ListDietPlansInput
): Promise<PaginatedResponse<DietPlanListItemDto>> {
	assertCanManageDietPlans(ctx);

	const { page, perPage, q, sortBy, sortOrder } = input;
	const where = combineConditions([
		q ? ilike(dietPlan.name, `%${q}%`) : undefined,
	]);
	const sortDirection = sortOrder === "asc" ? asc : desc;
	const sortColumn = DIET_PLAN_SORT_COLUMNS[sortBy ?? "createdAt"];

	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(dietPlan).where(where),
		// `slotCount` is an aggregate over `diet_plan_meal`, so the page query is
		// a LEFT JOIN + GROUP BY rather than a per-row count: plans with no slots
		// must still appear, and one grouped scan beats N follow-up queries.
		db
			.select({ ...dietPlanColumns, slotCount: count(dietPlanMeal.id) })
			.from(dietPlan)
			.leftJoin(dietPlanMeal, eq(dietPlan.id, dietPlanMeal.dietPlanId))
			.where(where)
			.groupBy(
				dietPlan.id,
				dietPlan.name,
				dietPlan.description,
				dietPlan.createdAt,
				dietPlan.updatedAt
			)
			.orderBy(sortDirection(sortColumn))
			.limit(perPage)
			.offset(calculateOffset(page, perPage)),
	]);

	return createPaginatedResponse(
		rows.map(dietPlanToListItemDto),
		page,
		perPage,
		countRows[0]?.count ?? 0
	);
}

/**
 * Loads a plan with its slots and the meal lines behind them.
 *
 * The lines are fetched with **one** batched query across every meal the plan
 * references and grouped in memory. A plan can easily carry 30 slots, and the
 * obvious per-slot query turns one page load into 30 round-trips.
 */
async function loadDietPlanDetail(
	planId: string
): Promise<DietPlanDetailDto | null> {
	const [planRows, slotRows] = await Promise.all([
		db
			.select(dietPlanColumns)
			.from(dietPlan)
			.where(eq(dietPlan.id, planId))
			.limit(1),
		db
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
			.where(eq(dietPlanMeal.dietPlanId, planId))
			.orderBy(
				asc(dietPlanMeal.dayNumber),
				asc(dietPlanMeal.mealType),
				asc(dietPlanMeal.mealOrder)
			),
	]);

	const plan = planRows[0];
	if (!plan) {
		return null;
	}

	const mealIds = uniqueIds(slotRows.map((slot) => slot.mealId));
	const itemRows =
		mealIds.length === 0
			? []
			: await db
					.select({
						foodItemId: mealItem.foodItemId,
						foodName: foodItem.name,
						gramsPerUnit: foodItem.gramsPerUnit,
						mealId: mealItem.mealId,
						mealItemId: mealItem.id,
						quantity: mealItem.quantity,
						unit: foodItem.unit,
					})
					.from(mealItem)
					.innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
					.where(inArray(mealItem.mealId, mealIds));

	return dietPlanToDetailDto(plan, slotRows, itemRows);
}

export async function getDietPlan(
	ctx: Context,
	input: GetDietPlanInput
): Promise<DietPlanDetailDto> {
	assertCanManageDietPlans(ctx);

	const detail = await loadDietPlanDetail(input.dietPlanId);
	if (!detail) {
		throw new HttpError(404, DIET_PLAN_NOT_FOUND);
	}
	return detail;
}

export async function createDietPlan(
	ctx: Context,
	input: CreateDietPlanInput
): Promise<DietPlanDto> {
	assertCanManageDietPlans(ctx);

	// One transaction so a plan is never persisted without the slots the caller
	// asked for.
	const created = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(dietPlan)
			.values({ description: input.description, name: input.name })
			.returning(dietPlanColumns);
		if (!inserted) {
			return null;
		}

		if (input.dietPlanMeals.length > 0) {
			await tx.insert(dietPlanMeal).values(
				input.dietPlanMeals.map((slot) => ({
					dayNumber: slot.dayNumber,
					dietPlanId: inserted.id,
					mealId: slot.mealId,
					mealOrder: slot.mealOrder,
					mealType: slot.mealType,
					scheduledTime: slot.scheduledTime ?? null,
				}))
			);
		}

		return inserted;
	});

	if (!created) {
		throw new HttpError(500, "Failed to create diet plan");
	}
	return dietPlanToDto(created);
}

/** Which of `slotIds` actually exist on this plan. */
async function loadExistingSlotIds(
	tx: DbTransaction,
	planId: string,
	slotIds: string[]
): Promise<string[]> {
	if (slotIds.length === 0) {
		return [];
	}
	const rows = await tx
		.select({ id: dietPlanMeal.id })
		.from(dietPlanMeal)
		.where(
			and(
				eq(dietPlanMeal.dietPlanId, planId),
				inArray(dietPlanMeal.id, slotIds)
			)
		);
	return rows.map((row) => row.id);
}

/** Which of `mealIds` actually exist. */
async function loadExistingMealIds(
	tx: DbTransaction,
	mealIds: string[]
): Promise<string[]> {
	if (mealIds.length === 0) {
		return [];
	}
	const rows = await tx
		.select({ id: meal.id })
		.from(meal)
		.where(inArray(meal.id, mealIds));
	return rows.map((row) => row.id);
}

interface DietPlanSlotPatch {
	dayNumber?: number;
	mealId?: string;
	mealOrder?: number;
	mealType?: string;
	scheduledTime?: string | null;
}

/** Only the fields the caller actually sent, so a patch never blanks a column. */
function slotPatchColumns(line: UpdateDietPlanMealInput): DietPlanSlotPatch {
	const patch: DietPlanSlotPatch = {};
	if (line.mealId !== undefined) {
		patch.mealId = line.mealId;
	}
	if (line.dayNumber !== undefined) {
		patch.dayNumber = line.dayNumber;
	}
	if (line.mealType !== undefined) {
		patch.mealType = line.mealType;
	}
	if (line.mealOrder !== undefined) {
		patch.mealOrder = line.mealOrder;
	}
	if (line.scheduledTime !== undefined) {
		patch.scheduledTime = line.scheduledTime;
	}
	return patch;
}

/**
 * Applies the mutations in FK-safe order: metadata → remove → patch → add.
 *
 * Same reasoning as on meals — deleting before patching lets one request
 * replace a slot, and adding last keeps new rows out of the id sets the earlier
 * steps validated against.
 */
async function applyDietPlanMutations(
	tx: DbTransaction,
	input: UpdateDietPlanInput
): Promise<void> {
	const { add, description, dietPlanId, name, remove, update } = input;

	const metadata: { description?: string | null; name?: string } = {};
	if (name !== undefined) {
		metadata.name = name;
	}
	if (description !== undefined) {
		metadata.description = description;
	}
	if (Object.keys(metadata).length > 0) {
		await tx.update(dietPlan).set(metadata).where(eq(dietPlan.id, dietPlanId));
	}

	if (remove?.length) {
		await tx
			.delete(dietPlanMeal)
			.where(
				and(
					eq(dietPlanMeal.dietPlanId, dietPlanId),
					inArray(dietPlanMeal.id, remove)
				)
			);
	}

	if (update?.length) {
		const patches = update
			.map((line) => ({ id: line.dietPlanMealId, set: slotPatchColumns(line) }))
			.filter((entry) => Object.keys(entry.set).length > 0);
		if (patches.length > 0) {
			// Distinct slot ids, so these never contend inside the transaction.
			await Promise.all(
				patches.map((entry) =>
					tx
						.update(dietPlanMeal)
						.set(entry.set)
						.where(
							and(
								eq(dietPlanMeal.id, entry.id),
								eq(dietPlanMeal.dietPlanId, dietPlanId)
							)
						)
				)
			);
		}
	}

	if (add?.length) {
		await tx.insert(dietPlanMeal).values(
			add.map((slot) => ({
				dayNumber: slot.dayNumber,
				dietPlanId,
				mealId: slot.mealId,
				mealOrder: slot.mealOrder,
				mealType: slot.mealType,
				scheduledTime: slot.scheduledTime ?? null,
			}))
		);
	}
}

export async function updateDietPlan(
	ctx: Context,
	input: UpdateDietPlanInput
): Promise<DietPlanDetailDto> {
	assertCanManageDietPlans(ctx);

	const { add, dietPlanId, remove, update } = input;

	await db.transaction(async (tx) => {
		const planRows = await tx
			.select({ id: dietPlan.id })
			.from(dietPlan)
			.where(eq(dietPlan.id, dietPlanId))
			.limit(1);
		if (!planRows[0]) {
			throw new HttpError(404, DIET_PLAN_NOT_FOUND);
		}

		assertDietPlanEditable(await dietPlanHasAssignments(tx, dietPlanId));
		assertNoDietPlanMealRemoveUpdateOverlap(
			remove,
			(update ?? []).map((line) => line.dietPlanMealId)
		);

		// Independent probes in parallel, ordered assertions after, so the error
		// a doubly-invalid payload gets never depends on query timing.
		const referencedSlotIds = [
			...(remove ?? []),
			...(update ?? []).map((line) => line.dietPlanMealId),
		];
		const addedMealIds = uniqueIds((add ?? []).map((slot) => slot.mealId));
		const [existingSlotIds, existingMealIds] = await Promise.all([
			loadExistingSlotIds(tx, dietPlanId, referencedSlotIds),
			loadExistingMealIds(tx, addedMealIds),
		]);
		assertSlotIdsBelongToPlan(referencedSlotIds, existingSlotIds);
		assertScheduledMealIdsExist(addedMealIds, existingMealIds);

		await applyDietPlanMutations(tx, input);
	});

	// The plan editor re-renders from the full plan, so answer with the same
	// shape `GET /diet-plans/:id` returns rather than the bare header.
	const detail = await loadDietPlanDetail(dietPlanId);
	if (!detail) {
		throw new HttpError(404, DIET_PLAN_NOT_FOUND);
	}
	return detail;
}

export async function deleteDietPlan(
	ctx: Context,
	input: DeleteDietPlanInput
): Promise<DietPlanDto> {
	assertCanManageDietPlans(ctx);

	return await db.transaction(async (tx) => {
		// Existence and the assignment lock are independent; the transaction
		// keeps an assignment from appearing between the probe and the delete.
		const [planRows, hasAssignments] = await Promise.all([
			tx
				.select({ id: dietPlan.id })
				.from(dietPlan)
				.where(eq(dietPlan.id, input.dietPlanId))
				.limit(1),
			dietPlanHasAssignments(tx, input.dietPlanId),
		]);

		if (!planRows[0]) {
			throw new HttpError(404, DIET_PLAN_NOT_FOUND);
		}
		assertDietPlanDeletable(hasAssignments);

		const [deleted] = await tx
			.delete(dietPlan)
			.where(eq(dietPlan.id, input.dietPlanId))
			.returning(dietPlanColumns);
		if (!deleted) {
			throw new HttpError(404, DIET_PLAN_NOT_FOUND);
		}
		return dietPlanToDto(deleted);
	});
}
