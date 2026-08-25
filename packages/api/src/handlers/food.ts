import type { DbClient, DbTransaction } from "@brnit/db";
import { db } from "@brnit/db";
import {
	dietPlanMealConsumptionItem,
	dietPlanMealItemOverride,
	foodCategory,
	foodItem,
	foodItemCategory,
	mealItem,
} from "@brnit/db/schema";
import type { FoodUnit } from "@brnit/domain";
import { isAppAdmin } from "@brnit/domain";
import { env } from "@brnit/env/server";
import {
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	ne,
	or,
} from "drizzle-orm";

import type { Context } from "../context";
import { combineConditions } from "../db/query-conditions";
import type { AlternativesTolerancePct } from "../food/alternatives";
import {
	buildFoodItemAlternatives,
	MAX_ALTERNATIVES_PER_PAGE,
	paginateAlternatives,
	referenceMacroTotals,
	toMacroNumber,
} from "../food/alternatives";
import type {
	DeletedFoodItemResponse,
	FoodCategoryListResponse,
	FoodCategoryResponse,
	FoodCategorySummaryListResponse,
	FoodItemAlternativesResponse,
	FoodItemDto,
	FoodItemListResponse,
	FoodItemResponse,
} from "../food/dto";
import {
	deletedFoodItemToDto,
	foodCategoryToDto,
	foodCategoryToSummaryDto,
	foodItemCategoriesToDto,
	foodItemToDto,
} from "../food/dto";
import { resolveFoodItemImageUpdate, uploadFoodItemImage } from "../food/image";
import type {
	CreateFoodCategoryInput,
	CreateFoodItemInput,
	FoodCategoryParams,
	FoodItemAlternativesInput,
	FoodItemParams,
	ListFoodCategoriesInput,
	ListFoodItemsInput,
	UpdateFoodCategoryByIdInput,
	UpdateFoodItemInput,
} from "../food/schemas";
import { HttpError } from "../http-error";
import { calculateOffset, createPaginatedResponse } from "../pagination/offset";

/**
 * Food categories, food items, and the alternatives search.
 *
 * Food data is global reference data — it is not organization-scoped and not
 * owned by any member — so the authorization split is simple and enforced here
 * rather than trusted from the route:
 *
 * - **reads** need a session, and nothing more. Admin, nutritionist and member
 *   routes all serve the same rows, which is why one handler backs all three.
 * - **writes** need the `admin` app role, on every route that reaches them.
 *
 * `requireAdmin` answers **401** (not 403) for an authenticated non-admin; the
 * re-assertion below returns the same status so a misrouted handler and a
 * correctly routed one are indistinguishable to the client.
 */

const UNAUTHORIZED_MESSAGE = "Unauthorized";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found";
const FOOD_ITEM_NOT_FOUND_MESSAGE = "Food item not found";
const FOOD_ITEM_IN_USE_EDIT_MESSAGE =
	"Cannot edit this food item while it is used in meals, diet plan overrides, or consumption logs";
const FOOD_ITEM_IN_USE_DELETE_MESSAGE =
	"Cannot delete this food item while it is used in meals, diet plan overrides, or consumption logs";
const CATEGORY_IN_USE_DELETE_MESSAGE =
	"Cannot delete this category while food items are assigned to it";
const INVALID_CATEGORY_IDS_MESSAGE = "One or more category IDs are invalid";
const NO_UPDATE_FIELDS_MESSAGE =
	"At least one field, file, or clearImage must be provided for update";

/** Reads may run on the request client or inside an open transaction. */
type FoodDbClient = DbClient | DbTransaction;

function assertAuthenticated(ctx: Context): void {
	if (!ctx.user) {
		throw new HttpError(401, UNAUTHORIZED_MESSAGE);
	}
}

function assertAppAdmin(ctx: Context): void {
	assertAuthenticated(ctx);
	if (!isAppAdmin(ctx.user?.role)) {
		throw new HttpError(401, UNAUTHORIZED_MESSAGE);
	}
}

/** Columns every food-item read selects; the DTO needs exactly these. */
const FOOD_ITEM_DTO_COLUMNS = {
	calories: true,
	carbs: true,
	createdAt: true,
	fat: true,
	gramsPerUnit: true,
	id: true,
	imagePublicId: true,
	name: true,
	protein: true,
	unit: true,
	updatedAt: true,
} as const;

/** Junction rows joined through to `{ id, name }`, for the DTO's `categories`. */
const FOOD_ITEM_CATEGORY_RELATION = {
	foodItemCategories: {
		with: {
			category: {
				columns: { id: true, name: true },
			},
		},
	},
} as const;

// ---------------------------------------------------------------------------
// Blocking references
// ---------------------------------------------------------------------------

/**
 * Whether a food item is referenced anywhere that makes it immutable: a meal
 * line, a per-assignment override, or a consumption log row.
 *
 * Editing a referenced food would silently rewrite history — a logged meal's
 * macros are read back through the food row, so changing it restates what
 * somebody already ate. Deleting is blocked by `RESTRICT` FKs anyway; this
 * turns that into a 409 the client can explain.
 *
 * Pass the surrounding transaction as `client` so the check and the write see
 * one snapshot.
 */
export async function foodItemHasBlockingReferences(
	foodItemId: string,
	client: FoodDbClient = db
): Promise<boolean> {
	const [mealRef, overrideRef, consumptionRef] = await Promise.all([
		client
			.select({ id: mealItem.id })
			.from(mealItem)
			.where(eq(mealItem.foodItemId, foodItemId))
			.limit(1),
		client
			.select({ id: dietPlanMealItemOverride.id })
			.from(dietPlanMealItemOverride)
			.where(eq(dietPlanMealItemOverride.foodItemId, foodItemId))
			.limit(1),
		client
			.select({ id: dietPlanMealConsumptionItem.id })
			.from(dietPlanMealConsumptionItem)
			.where(eq(dietPlanMealConsumptionItem.foodItemId, foodItemId))
			.limit(1),
	]);

	return (
		mealRef[0] !== undefined ||
		overrideRef[0] !== undefined ||
		consumptionRef[0] !== undefined
	);
}

/**
 * Whether any food item is still filed under this category.
 *
 * `food_item_category.food_category_id` is `ON DELETE RESTRICT`, so before the
 * overhaul the delete simply failed and the driver error surfaced as a 500.
 * Checking first turns that into a 409 with an actionable message.
 */
export async function foodCategoryHasBlockingReferences(
	foodCategoryId: string,
	client: FoodDbClient = db
): Promise<boolean> {
	const rows = await client
		.select({ foodItemId: foodItemCategory.foodItemId })
		.from(foodItemCategory)
		.where(eq(foodItemCategory.foodCategoryId, foodCategoryId))
		.limit(1);

	return rows[0] !== undefined;
}

/** Every id must resolve to a row, otherwise the junction insert would fail. */
async function foodCategoryIdsExist(
	client: FoodDbClient,
	ids: string[]
): Promise<boolean> {
	if (ids.length === 0) {
		return false;
	}
	const rows = await client
		.select({ id: foodCategory.id })
		.from(foodCategory)
		.where(inArray(foodCategory.id, ids));
	return rows.length === ids.length;
}

// ---------------------------------------------------------------------------
// Food categories
// ---------------------------------------------------------------------------

export async function listFoodCategories(
	ctx: Context,
	input: ListFoodCategoriesInput
): Promise<FoodCategoryListResponse> {
	assertAuthenticated(ctx);

	const { page, perPage, q, sortBy, sortOrder } = input;
	const offset = calculateOffset(page, perPage);

	// Search spans name *and* description — categories are short, and admins
	// look them up by either.
	const searchPattern = q ? `%${q}%` : null;
	const where = combineConditions([
		searchPattern
			? or(
					ilike(foodCategory.name, searchPattern),
					ilike(foodCategory.description, searchPattern)
				)
			: undefined,
	]);

	const sortColumn = {
		createdAt: foodCategory.createdAt,
		name: foodCategory.name,
	}[sortBy ?? "name"];
	const sortDirection = sortOrder === "asc" ? asc : desc;

	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(foodCategory).where(where),
		db
			.select()
			.from(foodCategory)
			.where(where)
			.orderBy(sortDirection(sortColumn))
			.limit(perPage)
			.offset(offset),
	]);

	return createPaginatedResponse(
		rows.map(foodCategoryToDto),
		page,
		perPage,
		countRows[0]?.count ?? 0
	);
}

/**
 * Flat, unpaginated category list for the member app.
 *
 * The native search filter sheet renders every category at once, so paging it
 * would only add a round trip; the table is small and admin-managed.
 */
export async function listAllFoodCategories(
	ctx: Context
): Promise<FoodCategorySummaryListResponse> {
	assertAuthenticated(ctx);

	const rows = await db
		.select({
			description: foodCategory.description,
			id: foodCategory.id,
			name: foodCategory.name,
		})
		.from(foodCategory)
		.orderBy(asc(foodCategory.name));

	return { data: rows.map(foodCategoryToSummaryDto) };
}

export async function getFoodCategory(
	ctx: Context,
	input: FoodCategoryParams
): Promise<FoodCategoryResponse> {
	assertAuthenticated(ctx);

	const rows = await db
		.select()
		.from(foodCategory)
		.where(eq(foodCategory.id, input.foodCategoryId))
		.limit(1);

	const row = rows[0];
	if (!row) {
		throw new HttpError(404, CATEGORY_NOT_FOUND_MESSAGE);
	}

	return { data: foodCategoryToDto(row) };
}

/** Blank descriptions are stored as `NULL`, never as an empty string. */
function normalizeCategoryDescription(
	description: string | undefined
): string | null {
	const trimmed = description?.trim();
	return trimmed ? trimmed : null;
}

export async function createFoodCategory(
	ctx: Context,
	input: CreateFoodCategoryInput
): Promise<FoodCategoryResponse> {
	assertAppAdmin(ctx);

	const rows = await db
		.insert(foodCategory)
		.values({
			description: normalizeCategoryDescription(input.description),
			name: input.name,
		})
		.returning();

	const created = rows[0];
	if (!created) {
		throw new HttpError(500, "Failed to create category");
	}

	return { data: foodCategoryToDto(created) };
}

export async function updateFoodCategory(
	ctx: Context,
	input: UpdateFoodCategoryByIdInput
): Promise<FoodCategoryResponse> {
	assertAppAdmin(ctx);

	const rows = await db
		.update(foodCategory)
		.set({
			description: normalizeCategoryDescription(input.description),
			name: input.name,
		})
		.where(eq(foodCategory.id, input.foodCategoryId))
		.returning();

	const updated = rows[0];
	if (!updated) {
		throw new HttpError(404, CATEGORY_NOT_FOUND_MESSAGE);
	}

	return { data: foodCategoryToDto(updated) };
}

export async function deleteFoodCategory(
	ctx: Context,
	input: FoodCategoryParams
): Promise<FoodCategoryResponse> {
	assertAppAdmin(ctx);

	const result = await db.transaction(async (tx) => {
		// Existence and the reference probe share the transaction snapshot, so a
		// junction row inserted between them cannot slip past the 409.
		const [rows, hasBlockingRefs] = await Promise.all([
			tx
				.select({ id: foodCategory.id })
				.from(foodCategory)
				.where(eq(foodCategory.id, input.foodCategoryId))
				.limit(1),
			foodCategoryHasBlockingReferences(input.foodCategoryId, tx),
		]);

		if (!rows[0]) {
			throw new HttpError(404, CATEGORY_NOT_FOUND_MESSAGE);
		}
		if (hasBlockingRefs) {
			throw new HttpError(409, CATEGORY_IN_USE_DELETE_MESSAGE);
		}

		const deletedRows = await tx
			.delete(foodCategory)
			.where(eq(foodCategory.id, input.foodCategoryId))
			.returning();

		const deleted = deletedRows[0];
		if (!deleted) {
			throw new HttpError(404, CATEGORY_NOT_FOUND_MESSAGE);
		}

		return { data: foodCategoryToDto(deleted) };
	});

	return result;
}

// ---------------------------------------------------------------------------
// Food items — reads
// ---------------------------------------------------------------------------

async function loadFoodItem(
	id: string,
	client: FoodDbClient = db
): Promise<FoodItemDto | null> {
	const row = await client.query.foodItem.findFirst({
		columns: FOOD_ITEM_DTO_COLUMNS,
		where: eq(foodItem.id, id),
		with: FOOD_ITEM_CATEGORY_RELATION,
	});

	return row ? foodItemToDto(row) : null;
}

export async function listFoodItems(
	ctx: Context,
	input: ListFoodItemsInput
): Promise<FoodItemListResponse> {
	assertAuthenticated(ctx);

	const { categoryId, page, perPage, q, sortBy, sortOrder } = input;
	const offset = calculateOffset(page, perPage);

	// The category filter goes through the junction table as a subquery rather
	// than a join, so the count query stays a plain count over `food_item`.
	const categoryFilter = categoryId
		? inArray(
				foodItem.id,
				db
					.select({ id: foodItemCategory.foodItemId })
					.from(foodItemCategory)
					.where(eq(foodItemCategory.foodCategoryId, categoryId))
			)
		: undefined;

	const where = combineConditions([
		q ? ilike(foodItem.name, `%${q}%`) : undefined,
		categoryFilter,
	]);

	const sortColumn = {
		calories: foodItem.calories,
		carbs: foodItem.carbs,
		createdAt: foodItem.createdAt,
		fat: foodItem.fat,
		name: foodItem.name,
		protein: foodItem.protein,
	}[sortBy ?? "createdAt"];
	const sortDirection = sortOrder === "asc" ? asc : desc;

	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(foodItem).where(where),
		db.query.foodItem.findMany({
			columns: FOOD_ITEM_DTO_COLUMNS,
			limit: perPage,
			offset,
			orderBy: [sortDirection(sortColumn)],
			where,
			with: FOOD_ITEM_CATEGORY_RELATION,
		}),
	]);

	return createPaginatedResponse(
		rows.map(foodItemToDto),
		page,
		perPage,
		countRows[0]?.count ?? 0
	);
}

export async function getFoodItem(
	ctx: Context,
	input: FoodItemParams
): Promise<FoodItemResponse> {
	assertAuthenticated(ctx);

	const item = await loadFoodItem(input.foodItemId);
	if (!item) {
		throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
	}

	return { data: item };
}

// ---------------------------------------------------------------------------
// Food items — writes
// ---------------------------------------------------------------------------

export async function createFoodItem(
	ctx: Context,
	input: CreateFoodItemInput
): Promise<FoodItemResponse> {
	assertAppAdmin(ctx);

	const { file, ...fields } = input;

	// Category ids are validated BEFORE the upload: a request naming a category
	// that does not exist must not leave an orphaned Cloudinary asset behind.
	if (!(await foodCategoryIdsExist(db, fields.categoryIds))) {
		// Pre-overhaul this answered a bare 500 ("Failed to create food item")
		// even though naming a category that does not exist is a client error,
		// while the identical check on update already answered 400. Aligned to
		// 400 so the two paths agree; see docs/migration/api-surface.md.
		throw new HttpError(400, INVALID_CATEGORY_IDS_MESSAGE);
	}

	// External I/O stays outside the transaction below.
	const imagePublicId = file ? await uploadFoodItemImage(file) : null;

	const result = await db.transaction(async (tx) => {
		// The master row is inserted first so the junction rows have a stable id.
		const createdRows = await tx
			.insert(foodItem)
			.values({
				calories: String(fields.calories),
				carbs: String(fields.carbs),
				fat: String(fields.fat),
				gramsPerUnit: fields.gramsPerUnit?.toString() ?? null,
				imagePublicId,
				name: fields.name,
				protein: String(fields.protein),
				unit: fields.unit,
			})
			.returning();

		const created = createdRows[0];
		if (!created) {
			throw new HttpError(500, "Failed to create food item");
		}

		await tx.insert(foodItemCategory).values(
			fields.categoryIds.map((foodCategoryId) => ({
				foodCategoryId,
				foodItemId: created.id,
			}))
		);

		const item = await loadFoodItem(created.id, tx);
		if (!item) {
			throw new HttpError(500, "Failed to create food item");
		}

		return { data: item };
	});

	return result;
}

interface FoodItemScalarUpdate {
	calories?: number | null;
	carbs?: number | null;
	fat?: number | null;
	gramsPerUnit?: number | null;
	name?: string;
	protein?: number | null;
	unit?: FoodUnit;
}

type FoodItemUpdateColumns = Partial<{
	calories: string;
	carbs: string;
	fat: string;
	gramsPerUnit: string | null;
	imagePublicId: string | null;
	name: string;
	protein: string;
	unit: FoodUnit;
}>;

/**
 * Builds the column patch.
 *
 * A macro sent as an explicit `null` clears to `'0'` rather than to `NULL`,
 * because the columns are `NOT NULL` — that is what the pre-overhaul service
 * did and what migration 0022 backfilled the table to.
 */
function buildFoodItemUpdateColumns(
	fields: FoodItemScalarUpdate,
	nextImagePublicId: string | null | undefined
): FoodItemUpdateColumns {
	const columns: FoodItemUpdateColumns = {};
	if (fields.name !== undefined) {
		columns.name = fields.name;
	}
	if (fields.calories !== undefined) {
		columns.calories = String(fields.calories ?? 0);
	}
	if (fields.protein !== undefined) {
		columns.protein = String(fields.protein ?? 0);
	}
	if (fields.carbs !== undefined) {
		columns.carbs = String(fields.carbs ?? 0);
	}
	if (fields.fat !== undefined) {
		columns.fat = String(fields.fat ?? 0);
	}
	if (fields.unit !== undefined) {
		columns.unit = fields.unit;
	}
	if (fields.gramsPerUnit !== undefined) {
		columns.gramsPerUnit = fields.gramsPerUnit?.toString() ?? null;
	}
	if (nextImagePublicId !== undefined) {
		columns.imagePublicId = nextImagePublicId;
	}
	return columns;
}

function hasFoodItemFieldChange(
	fields: FoodItemScalarUpdate,
	categoryIds: string[] | undefined
): boolean {
	return (
		fields.name !== undefined ||
		fields.calories !== undefined ||
		fields.protein !== undefined ||
		fields.carbs !== undefined ||
		fields.fat !== undefined ||
		fields.unit !== undefined ||
		fields.gramsPerUnit !== undefined ||
		categoryIds !== undefined
	);
}

export async function updateFoodItem(
	ctx: Context,
	input: UpdateFoodItemInput
): Promise<FoodItemResponse> {
	assertAppAdmin(ctx);

	const { categoryIds, clearImage, file, foodItemId, ...fields } = input;

	if (!(hasFoodItemFieldChange(fields, categoryIds) || file || clearImage)) {
		throw new HttpError(400, NO_UPDATE_FIELDS_MESSAGE);
	}

	const [existingRows, hasBlockingRefs] = await Promise.all([
		db
			.select({ imagePublicId: foodItem.imagePublicId })
			.from(foodItem)
			.where(eq(foodItem.id, foodItemId))
			.limit(1),
		foodItemHasBlockingReferences(foodItemId),
	]);

	const existing = existingRows[0];
	if (!existing) {
		throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
	}
	if (hasBlockingRefs) {
		throw new HttpError(409, FOOD_ITEM_IN_USE_EDIT_MESSAGE);
	}

	if (
		categoryIds !== undefined &&
		categoryIds.length > 0 &&
		!(await foodCategoryIdsExist(db, categoryIds))
	) {
		throw new HttpError(400, INVALID_CATEGORY_IDS_MESSAGE);
	}

	const nextImagePublicId = await resolveFoodItemImageUpdate(
		existing.imagePublicId,
		{ clearImage, file }
	);
	const columns = buildFoodItemUpdateColumns(fields, nextImagePublicId);

	await db.transaction(async (tx) => {
		if (Object.keys(columns).length > 0) {
			await tx.update(foodItem).set(columns).where(eq(foodItem.id, foodItemId));
		}
		if (categoryIds !== undefined) {
			// Replace-all: the junction has no surrogate key to diff against, and
			// the set is small enough that delete-then-insert is cheaper than a
			// three-way merge.
			await tx
				.delete(foodItemCategory)
				.where(eq(foodItemCategory.foodItemId, foodItemId));
			await tx.insert(foodItemCategory).values(
				categoryIds.map((foodCategoryId) => ({
					foodCategoryId,
					foodItemId,
				}))
			);
		}
	});

	const item = await loadFoodItem(foodItemId);
	if (!item) {
		throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
	}

	return { data: item };
}

export async function deleteFoodItem(
	ctx: Context,
	input: FoodItemParams
): Promise<DeletedFoodItemResponse> {
	assertAppAdmin(ctx);

	const result = await db.transaction(async (tx) => {
		const [rows, hasBlockingRefs] = await Promise.all([
			tx
				.select({ id: foodItem.id })
				.from(foodItem)
				.where(eq(foodItem.id, input.foodItemId))
				.limit(1),
			foodItemHasBlockingReferences(input.foodItemId, tx),
		]);

		if (!rows[0]) {
			throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
		}
		if (hasBlockingRefs) {
			throw new HttpError(409, FOOD_ITEM_IN_USE_DELETE_MESSAGE);
		}

		const deletedRows = await tx
			.delete(foodItem)
			.where(eq(foodItem.id, input.foodItemId))
			.returning();

		const deleted = deletedRows[0];
		if (!deleted) {
			throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
		}

		return { data: deletedFoodItemToDto(deleted) };
	});

	return result;
}

// ---------------------------------------------------------------------------
// Alternatives
// ---------------------------------------------------------------------------

function alternativesTolerancesFromEnv(): AlternativesTolerancePct {
	return {
		caloriesPct: env.ALTERNATIVES_TOLERANCE_CAL_PCT,
		carbsPct: env.ALTERNATIVES_TOLERANCE_CARBS_PCT,
		fatPct: env.ALTERNATIVES_TOLERANCE_FAT_PCT,
		proteinPct: env.ALTERNATIVES_TOLERANCE_PROTEIN_PCT,
	};
}

/**
 * The macro columns are `NOT NULL` today (migration 0022 backfilled them), so
 * this only fires for rows written before that. Kept because the endpoint's
 * `REFERENCE_INVALID` contract depends on it, and the parameter type is widened
 * so the runtime check is not compiled away as impossible.
 */
function hasMissingMacro(row: {
	calories: string | null;
	carbs: string | null;
	fat: string | null;
	protein: string | null;
}): boolean {
	return (
		row.calories === null ||
		row.protein === null ||
		row.carbs === null ||
		row.fat === null
	);
}

export async function getFoodItemAlternatives(
	ctx: Context,
	input: FoodItemAlternativesInput
): Promise<FoodItemAlternativesResponse> {
	assertAuthenticated(ctx);

	const { foodItemId, page, quantity } = input;
	// Re-clamped rather than trusted: the schema already caps it, but the page
	// size decides how much of the in-memory match list is materialized.
	const perPage = Math.min(
		Math.max(1, input.perPage),
		MAX_ALTERNATIVES_PER_PAGE
	);

	// The reference row and its category ids are independent reads.
	const [referenceCategoryRows, referenceRow] = await Promise.all([
		db
			.select({ foodCategoryId: foodItemCategory.foodCategoryId })
			.from(foodItemCategory)
			.where(eq(foodItemCategory.foodItemId, foodItemId)),
		db.query.foodItem.findFirst({
			columns: {
				calories: true,
				carbs: true,
				fat: true,
				gramsPerUnit: true,
				id: true,
				name: true,
				protein: true,
				unit: true,
			},
			where: eq(foodItem.id, foodItemId),
		}),
	]);

	if (!referenceRow) {
		throw new HttpError(404, FOOD_ITEM_NOT_FOUND_MESSAGE);
	}

	// No categories means no candidate pool: alternatives are only ever proposed
	// within the reference food's own categories.
	if (hasMissingMacro(referenceRow) || referenceCategoryRows.length === 0) {
		throw new HttpError(
			400,
			"Reference food item has missing macros or categories"
		);
	}

	const reference = referenceMacroTotals(quantity, {
		calories: toMacroNumber(referenceRow.calories),
		carbs: toMacroNumber(referenceRow.carbs),
		fat: toMacroNumber(referenceRow.fat),
		protein: toMacroNumber(referenceRow.protein),
		unit: referenceRow.unit,
	});

	const sharedCategoryItemIds = db
		.select({ id: foodItemCategory.foodItemId })
		.from(foodItemCategory)
		.where(
			inArray(
				foodItemCategory.foodCategoryId,
				referenceCategoryRows.map((row) => row.foodCategoryId)
			)
		);

	const candidateRows = await db.query.foodItem.findMany({
		columns: {
			calories: true,
			carbs: true,
			fat: true,
			gramsPerUnit: true,
			id: true,
			name: true,
			protein: true,
			unit: true,
		},
		where: combineConditions([
			ne(foodItem.id, foodItemId),
			isNotNull(foodItem.calories),
			isNotNull(foodItem.protein),
			isNotNull(foodItem.carbs),
			isNotNull(foodItem.fat),
			inArray(foodItem.id, sharedCategoryItemIds),
		]),
		with: FOOD_ITEM_CATEGORY_RELATION,
	});

	// Categories are mapped here so the scoring module stays free of the DTO
	// layer's Cloudinary dependency.
	const candidates = candidateRows.map(({ foodItemCategories, ...row }) => ({
		...row,
		categories: foodItemCategoriesToDto(foodItemCategories),
	}));

	const matches = buildFoodItemAlternatives({
		candidates,
		reference,
		tolerances: alternativesTolerancesFromEnv(),
	});

	return createPaginatedResponse(
		paginateAlternatives(matches, page, perPage),
		page,
		perPage,
		matches.length
	);
}
