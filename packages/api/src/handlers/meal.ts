import { type DbTransaction, db } from "@brnit/db";
import {
	dietPlanAssignment,
	dietPlanMeal,
	foodItem,
	meal,
	mealItem,
} from "@brnit/db/schema";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";

import type { Context } from "../context";
import { combineConditions } from "../db/query-conditions";
import { HttpError } from "../http-error";
import { assertCanManageMeals } from "../meal/access";
import { buildClonedMealName } from "../meal/clone-name";
import {
	assertMealFoodItemIdsExist,
	assertMealHasNoLineItems,
	assertMealItemIdsBelongToMeal,
	assertMealNotInAssignedPlan,
	assertMealNotUsedInDietPlan,
	assertNoMealItemRemoveUpdateOverlap,
} from "../meal/conflicts";
import {
	type MealDetailDto,
	type MealDto,
	mealToDetailDto,
	mealToDto,
} from "../meal/dto";
import { uniqueIds } from "../meal/mutation-ids";
import { recomputeMealTotals } from "../meal/recompute-totals";
import type {
	CloneMealInput,
	CreateMealInput,
	DeleteMealInput,
	GetMealInput,
	ListMealsInput,
	UpdateMealInput,
} from "../meal/schemas";
import {
	calculateOffset,
	createPaginatedResponse,
	type PaginatedResponse,
} from "../pagination/offset";

/**
 * Meal handlers. Mounted unchanged under both `/admin/meals` and
 * `/nutritionist/meals` — meals are a global catalog, not organization data, so
 * the two role paths differ only in which guard fronts them.
 *
 * Every handler re-asserts authorization instead of trusting the mount.
 *
 * The write paths are transactional because `meal.total_*` is a denormalized
 * aggregate: lines and totals must commit together or the meal is silently
 * wrong. See `../meal/recompute-totals`.
 */

const MEAL_NOT_FOUND = "Meal not found";

/** Columns of the meal header, shared by every read. */
const mealColumns = {
	createdAt: meal.createdAt,
	description: meal.description,
	id: meal.id,
	name: meal.name,
	totalCalories: meal.totalCalories,
	totalCarbs: meal.totalCarbs,
	totalFat: meal.totalFat,
	totalProtein: meal.totalProtein,
	updatedAt: meal.updatedAt,
};

const MEAL_SORT_COLUMNS = {
	createdAt: meal.createdAt,
	name: meal.name,
} as const;

interface MealLine {
	foodItemId: string;
	quantity: number;
}

export async function listMeals(
	ctx: Context,
	input: ListMealsInput
): Promise<PaginatedResponse<MealDto>> {
	assertCanManageMeals(ctx);

	const { page, perPage, q, sortBy, sortOrder } = input;
	const where = combineConditions([q ? ilike(meal.name, `%${q}%`) : undefined]);
	const sortDirection = sortOrder === "asc" ? asc : desc;
	const sortColumn = MEAL_SORT_COLUMNS[sortBy ?? "createdAt"];

	// Count and page rows are independent; one round-trip pair instead of two.
	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(meal).where(where),
		db
			.select(mealColumns)
			.from(meal)
			.where(where)
			.orderBy(sortDirection(sortColumn))
			.limit(perPage)
			.offset(calculateOffset(page, perPage)),
	]);

	return createPaginatedResponse(
		rows.map(mealToDto),
		page,
		perPage,
		countRows[0]?.count ?? 0
	);
}

export async function getMeal(
	ctx: Context,
	input: GetMealInput
): Promise<MealDetailDto> {
	assertCanManageMeals(ctx);

	// Header and lines share no ordering requirement; fetch concurrently.
	const [headerRows, itemRows] = await Promise.all([
		db.select(mealColumns).from(meal).where(eq(meal.id, input.mealId)).limit(1),
		db.query.mealItem.findMany({
			columns: { foodItemId: true, id: true, quantity: true },
			where: eq(mealItem.mealId, input.mealId),
			with: {
				foodItem: {
					columns: {
						calories: true,
						carbs: true,
						fat: true,
						gramsPerUnit: true,
						name: true,
						protein: true,
						unit: true,
					},
					with: {
						foodItemCategories: {
							with: { category: { columns: { id: true, name: true } } },
						},
					},
				},
			},
		}),
	]);

	const header = headerRows[0];
	if (!header) {
		throw new HttpError(404, MEAL_NOT_FOUND);
	}

	return mealToDetailDto(header, itemRows);
}

/**
 * Inserts a meal header, its lines and the resulting totals.
 *
 * The one primitive behind both `createMeal` and `cloneMeal`, so the two can
 * never drift on how totals are seeded.
 */
async function insertMealWithLines(
	tx: DbTransaction,
	input: { description?: string | null; lines: MealLine[]; name: string }
): Promise<MealDto | null> {
	const [inserted] = await tx
		.insert(meal)
		.values({ description: input.description, name: input.name })
		.returning({ id: meal.id });
	if (!inserted) {
		return null;
	}

	if (input.lines.length > 0) {
		await tx.insert(mealItem).values(
			input.lines.map((line) => ({
				foodItemId: line.foodItemId,
				mealId: inserted.id,
				quantity: line.quantity.toString(),
			}))
		);
	}

	await recomputeMealTotals(tx, inserted.id);

	const [withTotals] = await tx
		.select(mealColumns)
		.from(meal)
		.where(eq(meal.id, inserted.id))
		.limit(1);
	return withTotals ? mealToDto(withTotals) : null;
}

export async function createMeal(
	ctx: Context,
	input: CreateMealInput
): Promise<MealDto> {
	assertCanManageMeals(ctx);

	const created = await db.transaction((tx) =>
		insertMealWithLines(tx, {
			description: input.description,
			lines: input.mealItems.map((item) => ({
				foodItemId: item.foodItemId,
				quantity: item.quantity,
			})),
			name: input.name,
		})
	);

	if (!created) {
		throw new HttpError(500, "Failed to create meal");
	}
	return created;
}

/**
 * Copies a meal's header and lines into a new meal.
 *
 * `diet_plan_meal` is deliberately never touched, so the clone belongs to no
 * plan and is immediately editable — which is the point of cloning a meal that
 * an assignment has frozen. Lines are copied in `createdAt` order so the new
 * meal reads the same way as the original.
 */
export async function cloneMeal(
	ctx: Context,
	input: CloneMealInput
): Promise<MealDto> {
	assertCanManageMeals(ctx);

	const cloned = await db.transaction(async (tx) => {
		const [headerRows, lineRows] = await Promise.all([
			tx
				.select({
					description: meal.description,
					id: meal.id,
					name: meal.name,
				})
				.from(meal)
				.where(eq(meal.id, input.mealId))
				.limit(1),
			tx
				.select({
					foodItemId: mealItem.foodItemId,
					quantity: mealItem.quantity,
				})
				.from(mealItem)
				.where(eq(mealItem.mealId, input.mealId))
				.orderBy(asc(mealItem.createdAt)),
		]);

		const header = headerRows[0];
		if (!header) {
			throw new HttpError(404, MEAL_NOT_FOUND);
		}

		return await insertMealWithLines(tx, {
			description: header.description,
			lines: lineRows.map((row) => ({
				foodItemId: row.foodItemId,
				quantity: Number(row.quantity),
			})),
			name: buildClonedMealName(header.name),
		});
	});

	if (!cloned) {
		throw new HttpError(500, "Failed to clone meal");
	}
	return cloned;
}

/** Which of `mealItemIds` actually exist on this meal. */
async function loadExistingMealItemIds(
	tx: DbTransaction,
	mealId: string,
	mealItemIds: string[]
): Promise<string[]> {
	if (mealItemIds.length === 0) {
		return [];
	}
	const rows = await tx
		.select({ id: mealItem.id })
		.from(mealItem)
		.where(and(eq(mealItem.mealId, mealId), inArray(mealItem.id, mealItemIds)));
	return rows.map((row) => row.id);
}

/** Which of `foodItemIds` actually exist. */
async function loadExistingFoodItemIds(
	tx: DbTransaction,
	foodItemIds: string[]
): Promise<string[]> {
	if (foodItemIds.length === 0) {
		return [];
	}
	const rows = await tx
		.select({ id: foodItem.id })
		.from(foodItem)
		.where(inArray(foodItem.id, foodItemIds));
	return rows.map((row) => row.id);
}

/**
 * Applies the mutations in FK-safe order: metadata → remove → patch → insert.
 *
 * The order is deliberate. Removing before patching means a line can be
 * replaced within one request without the patch racing a delete, and inserting
 * last keeps new rows out of the id sets the earlier steps operate on. The
 * patches themselves target distinct ids, so they run in parallel inside the
 * transaction.
 */
async function applyMealMutations(
	tx: DbTransaction,
	input: UpdateMealInput
): Promise<void> {
	const { add, description, mealId, name, remove, update } = input;

	const metadata: { description?: string | null; name?: string } = {};
	if (name !== undefined) {
		metadata.name = name;
	}
	if (description !== undefined) {
		metadata.description = description;
	}
	if (Object.keys(metadata).length > 0) {
		await tx.update(meal).set(metadata).where(eq(meal.id, mealId));
	}

	if (remove?.length) {
		await tx
			.delete(mealItem)
			.where(and(eq(mealItem.mealId, mealId), inArray(mealItem.id, remove)));
	}

	if (update?.length) {
		await Promise.all(
			update.map((line) =>
				tx
					.update(mealItem)
					.set({ quantity: line.quantity.toString() })
					.where(
						and(eq(mealItem.id, line.mealItemId), eq(mealItem.mealId, mealId))
					)
			)
		);
	}

	if (add?.length) {
		await tx.insert(mealItem).values(
			add.map((line) => ({
				foodItemId: line.foodItemId,
				mealId,
				quantity: line.quantity.toString(),
			}))
		);
	}
}

/** True when the patch touches lines, and therefore the denormalized totals. */
function mutatesMealLines(input: UpdateMealInput): boolean {
	return (
		(input.add?.length ?? 0) +
			(input.remove?.length ?? 0) +
			(input.update?.length ?? 0) >
		0
	);
}

export async function updateMeal(
	ctx: Context,
	input: UpdateMealInput
): Promise<MealDto> {
	assertCanManageMeals(ctx);

	const { add, mealId, remove, update } = input;

	return await db.transaction(async (tx) => {
		// Existence and the assigned-plan lock are independent probes.
		const [mealRows, assignedPlanRows] = await Promise.all([
			tx.select({ id: meal.id }).from(meal).where(eq(meal.id, mealId)).limit(1),
			tx
				.select({ id: dietPlanMeal.id })
				.from(dietPlanMeal)
				.innerJoin(
					dietPlanAssignment,
					eq(dietPlanAssignment.dietPlanId, dietPlanMeal.dietPlanId)
				)
				.where(eq(dietPlanMeal.mealId, mealId))
				.limit(1),
		]);

		if (!mealRows[0]) {
			throw new HttpError(404, MEAL_NOT_FOUND);
		}
		assertMealNotInAssignedPlan(assignedPlanRows[0] != null);
		assertNoMealItemRemoveUpdateOverlap(
			remove,
			(update ?? []).map((line) => line.mealItemId)
		);

		// Both probes are independent, so they run together; the assertions that
		// follow are ordered, so a payload wrong in both ways always reports the
		// same error rather than whichever query happened to answer first.
		const referencedMealItemIds = [
			...(remove ?? []),
			...(update ?? []).map((line) => line.mealItemId),
		];
		const addedFoodItemIds = uniqueIds(
			(add ?? []).map((line) => line.foodItemId)
		);
		const [existingMealItemIds, existingFoodItemIds] = await Promise.all([
			loadExistingMealItemIds(tx, mealId, referencedMealItemIds),
			loadExistingFoodItemIds(tx, addedFoodItemIds),
		]);
		assertMealItemIdsBelongToMeal(referencedMealItemIds, existingMealItemIds);
		assertMealFoodItemIdsExist(addedFoodItemIds, existingFoodItemIds);

		await applyMealMutations(tx, input);

		// Name/description-only patches leave the lines alone, so the totals
		// still hold — recomputing would be a pointless extra round-trip.
		if (mutatesMealLines(input)) {
			await recomputeMealTotals(tx, mealId);
		}

		const [updated] = await tx
			.select(mealColumns)
			.from(meal)
			.where(eq(meal.id, mealId))
			.limit(1);
		if (!updated) {
			throw new HttpError(404, MEAL_NOT_FOUND);
		}
		return mealToDto(updated);
	});
}

export async function deleteMeal(
	ctx: Context,
	input: DeleteMealInput
): Promise<MealDto> {
	assertCanManageMeals(ctx);

	return await db.transaction(async (tx) => {
		const [existing] = await tx
			.select(mealColumns)
			.from(meal)
			.where(eq(meal.id, input.mealId))
			.limit(1);
		if (!existing) {
			throw new HttpError(404, MEAL_NOT_FOUND);
		}

		// Both FKs pointing at `meal` are RESTRICT; probe them together so the
		// delete either succeeds or fails with an actionable 409, never a 500.
		const [lineCountRows, planSlotRows] = await Promise.all([
			tx
				.select({ count: count() })
				.from(mealItem)
				.where(eq(mealItem.mealId, input.mealId)),
			tx
				.select({ id: dietPlanMeal.id })
				.from(dietPlanMeal)
				.where(eq(dietPlanMeal.mealId, input.mealId))
				.limit(1),
		]);

		assertMealHasNoLineItems(Number(lineCountRows[0]?.count ?? 0));
		assertMealNotUsedInDietPlan(planSlotRows[0] != null);

		const [deleted] = await tx
			.delete(meal)
			.where(eq(meal.id, input.mealId))
			.returning(mealColumns);
		if (!deleted) {
			throw new HttpError(404, MEAL_NOT_FOUND);
		}
		return mealToDto(deleted);
	});
}
