import { toDateStringUTC } from "@brnit/datetime";
import type { DbTransaction } from "@brnit/db";
import { db } from "@brnit/db";
import {
	dietPlanMealConsumption,
	dietPlanMealConsumptionItem,
	foodItem,
} from "@brnit/db/schema";
import { env } from "@brnit/env/server";
import { and, asc, count, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

import {
	listAssignmentIdsForUser,
	requireAssignmentForUser,
} from "../assignment/access";
import {
	listAssignmentIdsForOrganization,
	requireNutritionistScope,
	requireSessionUser,
} from "../assignment/authorization";
import type { DeletedFlagDto } from "../assignment/dto";
import type {
	DietPlanMealConsumptionDto,
	DietPlanMealConsumptionListItemDto,
} from "../consumption/dto";
import {
	dietPlanMealConsumptionToDto,
	dietPlanMealConsumptionToListItemDto,
} from "../consumption/dto";
import { resolvePlannedItemsForSlot } from "../consumption/planned-items";
import type { ConsumedItemInput } from "../consumption/schemas";
import type {
	CreateDietPlanMealConsumptionInput,
	DeleteDietPlanMealConsumptionBySlotInput,
	DietPlanMealConsumptionIdParams,
	DietPlanMealConsumptionListQuery,
} from "../consumption/schemas";
import {
	assignmentConsumptionWindow,
	consumptionBackdateWindow,
	isWithinDateWindow,
} from "../consumption/window";
import type { Context } from "../context";
import { combineConditions } from "../db/query-conditions";
import { HttpError } from "../http-error";
import type { PaginatedResponse } from "../pagination/offset";
import { calculateOffset, createPaginatedResponse } from "../pagination/offset";

/**
 * Meal consumptions — one row per (assignment, plan meal, day), with a snapshot
 * of the items that were eaten.
 *
 * Two date guards apply to a member's write and they are not redundant: the
 * assignment window asks whether the person was on a plan that day, the
 * backdate window asks whether the log is plausible. Both are inclusive, both
 * are computed on UTC calendar dates.
 */

const NO_ACTIVE_ORG = "Active organization required";
const ASSIGNMENT_NOT_FOUND = "Assignment not found";
const CONSUMPTION_NOT_FOUND = "Consumption not found";
const MEMBER_ACCESS_DENIED = "Forbidden: assignment not found or access denied";
const OUT_OF_ALLOWED_DATE_RANGE =
	"consumedAt must not be in the future and must be within the allowed backdate window";
const OUT_OF_ASSIGNMENT_RANGE =
	"consumedAt must be within the assignment period (startDate to endDate + grace days)";

const consumptionSortColumns = {
	consumedAt: dietPlanMealConsumption.consumedAt,
	consumedDate: dietPlanMealConsumption.consumedDate,
	createdAt: dietPlanMealConsumption.createdAt,
} as const;

interface ConsumptionListScope {
	/** A single assignment, already authorized by the caller. */
	assignmentId?: string;
	/** The set the caller may see; `undefined` means unrestricted (app admin). */
	assignmentIds?: string[];
}

async function listConsumptions(
	input: DietPlanMealConsumptionListQuery,
	scope: ConsumptionListScope
): Promise<PaginatedResponse<DietPlanMealConsumptionListItemDto>> {
	let assignmentFilter: SQL<unknown> | undefined;
	if (scope.assignmentId) {
		assignmentFilter = eq(
			dietPlanMealConsumption.dietPlanAssignmentId,
			scope.assignmentId
		);
	} else if (scope.assignmentIds) {
		if (scope.assignmentIds.length === 0) {
			return createPaginatedResponse([], input.page, input.perPage, 0);
		}
		assignmentFilter = inArray(
			dietPlanMealConsumption.dietPlanAssignmentId,
			scope.assignmentIds
		);
	}

	const where = combineConditions([
		assignmentFilter,
		input.consumedDateFrom
			? gte(dietPlanMealConsumption.consumedDate, input.consumedDateFrom)
			: undefined,
		input.consumedDateTo
			? lte(dietPlanMealConsumption.consumedDate, input.consumedDateTo)
			: undefined,
	]);

	const sortColumn = consumptionSortColumns[input.sortBy ?? "consumedAt"];
	const orderBy = input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(dietPlanMealConsumption).where(where),
		db.query.dietPlanMealConsumption.findMany({
			columns: {
				consumedAt: true,
				consumedDate: true,
				createdAt: true,
				dietPlanAssignmentId: true,
				dietPlanMealId: true,
				id: true,
			},
			limit: input.perPage,
			offset: calculateOffset(input.page, input.perPage),
			orderBy: [orderBy],
			where,
			with: {
				consumedItems: {
					columns: { foodItemId: true, quantity: true },
					with: { foodItem: { columns: { name: true } } },
				},
				dietPlanMeal: {
					columns: {},
					with: { meal: { columns: { name: true } } },
				},
			},
		}),
	]);

	return createPaginatedResponse(
		rows.map(dietPlanMealConsumptionToListItemDto),
		input.page,
		input.perPage,
		countRows[0]?.count ?? 0
	);
}

/** Drops the zero and negative quantities a client may have sent. */
function positiveConsumedItems(
	items: ConsumedItemInput[] | undefined
): ConsumedItemInput[] | undefined {
	return items?.filter((item) => item.quantity > 0);
}

async function findMissingFoodItemIds(
	foodItemIds: string[]
): Promise<string[]> {
	if (foodItemIds.length === 0) {
		return [];
	}
	const rows = await db
		.select({ id: foodItem.id })
		.from(foodItem)
		.where(inArray(foodItem.id, foodItemIds));

	const known = new Set(rows.map((row) => row.id));
	return foodItemIds.filter((id) => !known.has(id));
}

async function findExistingConsumptionId(params: {
	consumedDate: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}): Promise<string | undefined> {
	const [existing] = await db
		.select({ id: dietPlanMealConsumption.id })
		.from(dietPlanMealConsumption)
		.where(
			and(
				eq(
					dietPlanMealConsumption.dietPlanAssignmentId,
					params.dietPlanAssignmentId
				),
				eq(dietPlanMealConsumption.dietPlanMealId, params.dietPlanMealId),
				eq(dietPlanMealConsumption.consumedDate, params.consumedDate)
			)
		)
		.limit(1);
	return existing?.id;
}

/**
 * Writes one consumption and its item snapshot (§8.6).
 *
 * The backdate guard lives here rather than in the routes because it protects an
 * invariant of the record itself: a consumption dated in the future, or far in
 * the past, is not a log but an edit of history.
 */
async function logConsumption(
	input: CreateDietPlanMealConsumptionInput
): Promise<DietPlanMealConsumptionDto> {
	const consumedDate = toDateStringUTC(input.consumedAt);
	const backdateWindow = consumptionBackdateWindow(
		toDateStringUTC(new Date()),
		env.MAX_CONSUMPTION_PAST_DAYS
	);
	if (!isWithinDateWindow(consumedDate, backdateWindow)) {
		throw new HttpError(400, OUT_OF_ALLOWED_DATE_RANGE, {
			reason: `consumedAt must be between ${backdateWindow.minDate} and ${backdateWindow.maxDate}`,
		});
	}

	let consumedItems = positiveConsumedItems(input.consumedItems);

	if (input.usePlannedItems && !consumedItems?.length) {
		const planned = await resolvePlannedItemsForSlot(
			input.dietPlanAssignmentId,
			input.dietPlanMealId,
			consumedDate
		);
		if (planned === null) {
			throw new HttpError(
				400,
				"Diet plan meal not found or does not belong to this assignment"
			);
		}
		consumedItems = planned;
	}

	const foodItemIds = consumedItems?.length
		? [...new Set(consumedItems.map((item) => item.foodItemId))]
		: [];

	// Independent reads, but the *reporting* order is fixed: a duplicate is
	// reported as a 409 even when the payload also names a missing food.
	const [duplicateId, missingFoodItemIds] = await Promise.all([
		findExistingConsumptionId({
			consumedDate,
			dietPlanAssignmentId: input.dietPlanAssignmentId,
			dietPlanMealId: input.dietPlanMealId,
		}),
		findMissingFoodItemIds(foodItemIds),
	]);
	if (duplicateId) {
		throw new HttpError(
			409,
			"Consumption already logged for this slot on this date"
		);
	}
	if (missingFoodItemIds.length > 0) {
		throw new HttpError(
			400,
			`Food item(s) not found: ${missingFoodItemIds.join(", ")}`
		);
	}

	const items = consumedItems ?? [];
	const created = await db.transaction(async (tx: DbTransaction) => {
		const [inserted] = await tx
			.insert(dietPlanMealConsumption)
			.values({
				consumedAt: input.consumedAt,
				consumedDate,
				dietPlanAssignmentId: input.dietPlanAssignmentId,
				dietPlanMealId: input.dietPlanMealId,
			})
			.returning();
		if (!inserted) {
			throw new HttpError(400, "Failed to log consumption");
		}

		if (items.length > 0) {
			await tx.insert(dietPlanMealConsumptionItem).values(
				items.map((item) => ({
					dietPlanMealConsumptionId: inserted.id,
					foodItemId: item.foodItemId,
					quantity: String(item.quantity),
				}))
			);
		}
		return inserted;
	});

	return dietPlanMealConsumptionToDto(created);
}

// ---------------------------------------------------------------------------
// Nutritionist
// ---------------------------------------------------------------------------

/**
 * Consumptions for the nutritionist's own organization.
 *
 * **Behaviour change from the Next.js route**, agreed as part of the overhaul:
 * the old handler took `dietPlanAssignmentId` on trust, so any nutritionist with
 * an active organization could read any client's log by guessing an id. The
 * visible set is now the assignments held by members of the active organization.
 * App admins stay unscoped, matching every other assignment endpoint.
 */
export async function listNutritionistDietPlanMealConsumptions(
	ctx: Context,
	input: DietPlanMealConsumptionListQuery
): Promise<PaginatedResponse<DietPlanMealConsumptionListItemDto>> {
	const scope = requireNutritionistScope(ctx);

	if (scope.isAppAdmin) {
		return await listConsumptions(input, {
			assignmentId: input.dietPlanAssignmentId,
		});
	}
	if (!scope.organizationId) {
		throw new HttpError(403, NO_ACTIVE_ORG);
	}

	const visibleAssignmentIds = await listAssignmentIdsForOrganization(
		scope.organizationId
	);

	if (input.dietPlanAssignmentId) {
		if (!visibleAssignmentIds.includes(input.dietPlanAssignmentId)) {
			throw new HttpError(404, ASSIGNMENT_NOT_FOUND);
		}
		return await listConsumptions(input, {
			assignmentId: input.dietPlanAssignmentId,
		});
	}
	return await listConsumptions(input, {
		assignmentIds: visibleAssignmentIds,
	});
}

/**
 * Logs a consumption on a client's behalf.
 *
 * Only the service-level backdate window applies — a nutritionist correcting a
 * client's log is not bound by the assignment's grace period, which is a
 * client-app affordance.
 */
export async function createNutritionistDietPlanMealConsumption(
	ctx: Context,
	input: CreateDietPlanMealConsumptionInput
): Promise<{ data: DietPlanMealConsumptionDto }> {
	requireNutritionistScope(ctx);
	return { data: await logConsumption(input) };
}

export async function deleteNutritionistDietPlanMealConsumption(
	ctx: Context,
	input: DietPlanMealConsumptionIdParams
): Promise<{ data: DietPlanMealConsumptionDto }> {
	requireNutritionistScope(ctx);

	const [deleted] = await db
		.delete(dietPlanMealConsumption)
		.where(eq(dietPlanMealConsumption.id, input.id))
		.returning();
	if (!deleted) {
		throw new HttpError(404, CONSUMPTION_NOT_FOUND);
	}
	return { data: dietPlanMealConsumptionToDto(deleted) };
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

export async function listMemberDietPlanMealConsumptions(
	ctx: Context,
	input: DietPlanMealConsumptionListQuery
): Promise<PaginatedResponse<DietPlanMealConsumptionListItemDto>> {
	const user = requireSessionUser(ctx);

	if (input.dietPlanAssignmentId) {
		await requireAssignmentForUser(
			user.id,
			input.dietPlanAssignmentId,
			MEMBER_ACCESS_DENIED
		);
		return await listConsumptions(input, {
			assignmentId: input.dietPlanAssignmentId,
		});
	}

	return await listConsumptions(input, {
		assignmentIds: await listAssignmentIdsForUser(user.id),
	});
}

/**
 * Marks a meal as eaten.
 *
 * Ownership first, then the assignment window (which needs the assignment row
 * anyway), then the backdate window inside {@link logConsumption}. The two
 * windows report differently on purpose: the assignment failure returns the
 * plan's own dates so the client can explain *why*, while the backdate failure
 * returns only the allowed range.
 */
export async function createMemberDietPlanMealConsumption(
	ctx: Context,
	input: CreateDietPlanMealConsumptionInput
): Promise<{ data: DietPlanMealConsumptionDto }> {
	const user = requireSessionUser(ctx);
	const assignment = await requireAssignmentForUser(
		user.id,
		input.dietPlanAssignmentId,
		MEMBER_ACCESS_DENIED
	);

	const graceDays = env.DIET_PLAN_CONSUMPTION_GRACE_DAYS;
	const consumedDate = toDateStringUTC(input.consumedAt);
	const window = assignmentConsumptionWindow(assignment, graceDays);
	if (!isWithinDateWindow(consumedDate, window)) {
		throw new HttpError(400, OUT_OF_ASSIGNMENT_RANGE, {
			endDate: assignment.endDate,
			graceDays,
			startDate: assignment.startDate,
		});
	}

	return { data: await logConsumption(input) };
}

/** Unmarks a meal: delete by slot, not by id — the client knows the day, not the row. */
export async function deleteMemberDietPlanMealConsumptionBySlot(
	ctx: Context,
	input: DeleteDietPlanMealConsumptionBySlotInput
): Promise<{ data: DeletedFlagDto }> {
	const user = requireSessionUser(ctx);
	await requireAssignmentForUser(
		user.id,
		input.dietPlanAssignmentId,
		MEMBER_ACCESS_DENIED
	);

	const [deleted] = await db
		.delete(dietPlanMealConsumption)
		.where(
			and(
				eq(
					dietPlanMealConsumption.dietPlanAssignmentId,
					input.dietPlanAssignmentId
				),
				eq(dietPlanMealConsumption.dietPlanMealId, input.dietPlanMealId),
				eq(dietPlanMealConsumption.consumedDate, input.consumedDate)
			)
		)
		.returning();
	if (!deleted) {
		throw new HttpError(404, CONSUMPTION_NOT_FOUND);
	}
	return { data: { deleted: true } };
}
