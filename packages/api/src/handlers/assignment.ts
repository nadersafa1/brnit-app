import { getTodayUtcDateString } from "@brnit/datetime";
import type { DbTransaction } from "@brnit/db";
import { db } from "@brnit/db";
import { dietPlan, dietPlanAssignment, member } from "@brnit/db/schema";
import { asc, count, desc, eq, inArray, or } from "drizzle-orm";

import {
	assertAssignmentInOrganization,
	listOrganizationMemberIds,
	requireAssignableMember,
	requireNutritionistOrganizationId,
	requireNutritionistScope,
	requireSessionUser,
} from "../assignment/authorization";
import {
	listMemberIdSetForUser,
	requireAssignmentForUser,
} from "../assignment/access";
import type {
	DeletedFlagDto,
	DietPlanAssignmentDto,
	DietPlanAssignmentWithMealTimesDto,
	MealItemOverrideDto,
	MemberDietPlanAssignmentDto,
} from "../assignment/dto";
import {
	dietPlanAssignmentToDto,
	dietPlanAssignmentWithMealTimesToDto,
	mealItemOverrideToDto,
	memberDietPlanAssignmentToDto,
} from "../assignment/dto";
import {
	deleteMealItemOverrideDate,
	deleteMealItemOverrideSlot,
	requireOverrideSlot,
	upsertMealItemOverrideRow,
} from "../assignment/meal-item-overrides";
import {
	listFutureMealTimeOverrides,
	listFutureMealTimeOverridesForAssignments,
	saveAssignmentMealTimeOverrides,
} from "../assignment/meal-time-overrides";
import {
	buildEffectiveDatesForScope,
	dedupeAndSortDateStrings,
	normalizeOverrideScopeWindow,
} from "../assignment/override-dates";
import { assertNoOverlappingAssignment } from "../assignment/overlap";
import type {
	CreateDietPlanAssignmentInput,
	CreateDietPlanAssignmentNutritionistInput,
	DeleteMealItemOverrideInput,
	DietPlanAssignmentIdParams,
	DietPlanAssignmentListQuery,
	MealTimeOverrideInput,
	SetMealItemOverrideInput,
	UpdateDietPlanAssignmentInput,
} from "../assignment/schemas";
import type { Context } from "../context";
import { combineConditions } from "../db/query-conditions";
import { HttpError } from "../http-error";
import type { PaginatedResponse } from "../pagination/offset";
import { calculateOffset, createPaginatedResponse } from "../pagination/offset";

/**
 * Diet-plan assignments and the two kinds of override that hang off them.
 *
 * An assignment is the join between a person and a plan for a date range, and it
 * is the anchor for everything the member sees: consumptions, meal-time changes
 * and food swaps all cascade from it. The invariant that makes the rest of the
 * product coherent is that a person holds **at most one assignment covering any
 * given day, organization-wide** — see `../assignment/overlap.ts`.
 */

const NO_ACTIVE_ORG_FOR_LIST =
	"Active organization required for listing assignments";
const NO_ACTIVE_ORG_FOR_CREATE =
	"Active organization required for creating assignments";
const NO_ACTIVE_ORG = "Active organization required";
const ASSIGNMENT_NOT_FOUND = "Assignment not found";
const OVERRIDE_ACCESS_DENIED = "Assignment not found or access denied";

const assignmentSortColumns = {
	createdAt: dietPlanAssignment.createdAt,
	endDate: dietPlanAssignment.endDate,
	startDate: dietPlanAssignment.startDate,
} as const;

/**
 * Restricts a nutritionist read/write to their active organization. App admins
 * are exempt, matching the pre-overhaul detail routes.
 */
async function assertAssignmentVisible(
	ctx: Context,
	assignmentId: string
): Promise<void> {
	const scope = requireNutritionistScope(ctx);
	if (scope.isAppAdmin) {
		return;
	}
	if (!scope.organizationId) {
		throw new HttpError(403, NO_ACTIVE_ORG);
	}
	await assertAssignmentInOrganization(assignmentId, scope.organizationId);
}

async function findAssignmentRow(
	assignmentId: string
): Promise<typeof dietPlanAssignment.$inferSelect | undefined> {
	const [row] = await db
		.select()
		.from(dietPlanAssignment)
		.where(eq(dietPlanAssignment.id, assignmentId))
		.limit(1);
	return row;
}

/**
 * The `user.id` a plan is really being assigned to.
 *
 * The assignee columns are an XOR, so this collapses both forms to the single
 * identity the overlap rule reasons about.
 */
async function resolveAssigneeUserId(
	memberId: string | null,
	userId: string | null
): Promise<string | null> {
	if (userId) {
		return userId;
	}
	if (!memberId) {
		return null;
	}
	const [row] = await db
		.select({ userId: member.userId })
		.from(member)
		.where(eq(member.id, memberId))
		.limit(1);
	return row?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Nutritionist
// ---------------------------------------------------------------------------

export async function listNutritionistDietPlanAssignments(
	ctx: Context,
	input: DietPlanAssignmentListQuery
): Promise<PaginatedResponse<DietPlanAssignmentWithMealTimesDto>> {
	const organizationId = requireNutritionistOrganizationId(
		ctx,
		NO_ACTIVE_ORG_FOR_LIST
	);

	const organizationMemberIds = await listOrganizationMemberIds(organizationId);
	if (organizationMemberIds.length === 0) {
		return createPaginatedResponse([], input.page, input.perPage, 0);
	}

	const where = combineConditions([
		inArray(dietPlanAssignment.memberId, organizationMemberIds),
		input.memberId ? eq(dietPlanAssignment.memberId, input.memberId) : undefined,
		input.userId ? eq(dietPlanAssignment.userId, input.userId) : undefined,
		input.dietPlanId
			? eq(dietPlanAssignment.dietPlanId, input.dietPlanId)
			: undefined,
	]);

	const sortColumn = assignmentSortColumns[input.sortBy ?? "createdAt"];
	const orderBy = input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

	const [countRows, rows] = await Promise.all([
		db.select({ count: count() }).from(dietPlanAssignment).where(where),
		db
			.select()
			.from(dietPlanAssignment)
			.where(where)
			.orderBy(orderBy)
			.limit(input.perPage)
			.offset(calculateOffset(input.page, input.perPage)),
	]);

	const mealTimesByAssignment = await listFutureMealTimeOverridesForAssignments(
		rows.map((row) => row.id)
	);

	return createPaginatedResponse(
		rows.map((row) =>
			dietPlanAssignmentWithMealTimesToDto(
				row,
				mealTimesByAssignment.get(row.id) ?? []
			)
		),
		input.page,
		input.perPage,
		countRows[0]?.count ?? 0
	);
}

/**
 * Creates an assignment (§8.3).
 *
 * The organization rules run before anything else so a caller learns their
 * member is ineligible without the plan lookup, and the overlap probe runs
 * before the transaction so a conflict costs no write.
 */
async function createAssignment(
	input: CreateDietPlanAssignmentInput
): Promise<DietPlanAssignmentDto> {
	const { memberId, organizationId, userId } = input;

	let assigneeUserId: string | null = null;
	if (organizationId) {
		if (!memberId || userId) {
			throw new HttpError(
				400,
				"Member ID required for organization-scoped assignment; userId not allowed"
			);
		}
		const assignable = await requireAssignableMember(memberId, organizationId);
		assigneeUserId = assignable.userId;
	}

	const [planRows, resolvedUserId] = await Promise.all([
		db
			.select({ id: dietPlan.id })
			.from(dietPlan)
			.where(eq(dietPlan.id, input.dietPlanId))
			.limit(1),
		assigneeUserId === null
			? resolveAssigneeUserId(memberId ?? null, userId ?? null)
			: Promise.resolve(assigneeUserId),
	]);

	if (!planRows[0]) {
		throw new HttpError(404, "Diet plan not found");
	}
	if (!resolvedUserId) {
		throw new HttpError(404, "Member or user not found");
	}

	await assertNoOverlappingAssignment({
		assigneeUserId: resolvedUserId,
		range: { endDate: input.endDate, startDate: input.startDate },
	});

	const created = await db.transaction(async (tx: DbTransaction) => {
		const [inserted] = await tx
			.insert(dietPlanAssignment)
			.values({
				dietPlanId: input.dietPlanId,
				endDate: input.endDate,
				memberId: memberId ?? null,
				startDate: input.startDate,
				userId: userId ?? null,
			})
			.returning();
		if (!inserted) {
			throw new HttpError(400, "Failed to create assignment");
		}

		await saveAssignmentMealTimeOverrides(
			tx,
			inserted.id,
			input.dietPlanId,
			input.mealTimeOverrides ?? []
		);
		return inserted;
	});

	return dietPlanAssignmentToDto(created);
}

export async function createNutritionistDietPlanAssignment(
	ctx: Context,
	input: CreateDietPlanAssignmentNutritionistInput
): Promise<{ data: DietPlanAssignmentDto }> {
	const organizationId = requireNutritionistOrganizationId(
		ctx,
		NO_ACTIVE_ORG_FOR_CREATE
	);
	return { data: await createAssignment({ ...input, organizationId }) };
}

export async function getNutritionistDietPlanAssignment(
	ctx: Context,
	input: DietPlanAssignmentIdParams
): Promise<{ data: DietPlanAssignmentWithMealTimesDto }> {
	requireNutritionistScope(ctx);

	const row = await findAssignmentRow(input.id);
	if (!row) {
		throw new HttpError(404, ASSIGNMENT_NOT_FOUND);
	}
	await assertAssignmentVisible(ctx, input.id);

	const mealTimeOverrides = await listFutureMealTimeOverrides(input.id);
	return {
		data: dietPlanAssignmentWithMealTimesToDto(row, mealTimeOverrides),
	};
}

/**
 * Moves an assignment's window and/or rewrites its meal times.
 *
 * The overlap probe re-runs **excluding this assignment**, because a row always
 * overlaps itself; without the exclusion no assignment could ever be edited.
 */
export async function updateNutritionistDietPlanAssignment(
	ctx: Context,
	input: UpdateDietPlanAssignmentInput
): Promise<{ data: DietPlanAssignmentDto }> {
	await assertAssignmentVisible(ctx, input.id);

	const existing = await findAssignmentRow(input.id);
	if (!existing) {
		throw new HttpError(404, ASSIGNMENT_NOT_FOUND);
	}

	const startDate = input.startDate ?? existing.startDate;
	const endDate = input.endDate ?? existing.endDate;
	if (startDate > endDate) {
		throw new HttpError(
			400,
			"End date must be greater than or equal to start date"
		);
	}

	const assigneeUserId = await resolveAssigneeUserId(
		existing.memberId,
		existing.userId
	);
	if (assigneeUserId) {
		await assertNoOverlappingAssignment({
			assigneeUserId,
			excludeAssignmentId: input.id,
			range: { endDate, startDate },
		});
	}

	const mealTimeOverrides: MealTimeOverrideInput[] | undefined =
		input.mealTimeOverrides;

	const updated = await db.transaction(async (tx: DbTransaction) => {
		const [row] = await tx
			.update(dietPlanAssignment)
			.set({ endDate, startDate })
			.where(eq(dietPlanAssignment.id, input.id))
			.returning();
		if (!row) {
			throw new HttpError(404, ASSIGNMENT_NOT_FOUND);
		}

		if (mealTimeOverrides !== undefined) {
			await saveAssignmentMealTimeOverrides(
				tx,
				input.id,
				existing.dietPlanId,
				mealTimeOverrides
			);
		}
		return row;
	});

	return { data: dietPlanAssignmentToDto(updated) };
}

/** Deletes an assignment; consumptions and both override tables cascade. */
export async function deleteNutritionistDietPlanAssignment(
	ctx: Context,
	input: DietPlanAssignmentIdParams
): Promise<{ data: DietPlanAssignmentDto }> {
	await assertAssignmentVisible(ctx, input.id);

	const [deleted] = await db
		.delete(dietPlanAssignment)
		.where(eq(dietPlanAssignment.id, input.id))
		.returning();
	if (!deleted) {
		throw new HttpError(404, ASSIGNMENT_NOT_FOUND);
	}
	return { data: dietPlanAssignmentToDto(deleted) };
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

/** Every assignment the caller holds, oldest window first. Unpaginated by design. */
export async function listMemberDietPlanAssignments(
	ctx: Context
): Promise<{ data: MemberDietPlanAssignmentDto[] }> {
	const user = requireSessionUser(ctx);
	const memberIds = [...(await listMemberIdSetForUser(user.id))];

	const directlyAssigned = eq(dietPlanAssignment.userId, user.id);
	const owned =
		memberIds.length > 0
			? or(directlyAssigned, inArray(dietPlanAssignment.memberId, memberIds))
			: directlyAssigned;

	const rows = await db
		.select({
			createdAt: dietPlanAssignment.createdAt,
			dietPlanId: dietPlanAssignment.dietPlanId,
			endDate: dietPlanAssignment.endDate,
			id: dietPlanAssignment.id,
			planName: dietPlan.name,
			startDate: dietPlanAssignment.startDate,
		})
		.from(dietPlanAssignment)
		.innerJoin(dietPlan, eq(dietPlanAssignment.dietPlanId, dietPlan.id))
		.where(owned)
		.orderBy(asc(dietPlanAssignment.startDate));

	return { data: rows.map(memberDietPlanAssignmentToDto) };
}

/**
 * Swaps a food in one line of one meal (§8.5).
 *
 * `single_day` writes exactly the requested day and may reach into the past —
 * correcting yesterday is legitimate. `rest_of_plan` starts no earlier than
 * today and runs to the assignment's end, so "from now on" never rewrites days
 * already lived. `created` drives the route's 201-vs-200 and is not part of the
 * response body.
 */
export async function setMemberMealItemOverride(
	ctx: Context,
	input: SetMealItemOverrideInput
): Promise<{ created: boolean; data: MealItemOverrideDto }> {
	const user = requireSessionUser(ctx);
	const assignment = await requireAssignmentForUser(
		user.id,
		input.assignmentId,
		OVERRIDE_ACCESS_DENIED
	);

	await requireOverrideSlot({
		assignment,
		dietPlanMealId: input.dietPlanMealId,
		foodItemId: input.foodItemId,
		mealItemId: input.mealItemId,
	});

	const window = normalizeOverrideScopeWindow(input, getTodayUtcDateString());
	const effectiveDates = dedupeAndSortDateStrings(
		buildEffectiveDatesForScope(window, assignment.endDate)
	);
	if (effectiveDates.length === 0) {
		throw new HttpError(400, "No effective dates in assignment range");
	}

	const outcome = await upsertMealItemOverrideRow({
		effectiveDates,
		foodItemId: input.foodItemId,
		intentScope: window.scope,
		intentStartDate: window.startDate,
		overrideId: input.overrideId,
		quantity: input.quantity,
		slot: {
			assignmentId: assignment.id,
			dietPlanMealId: input.dietPlanMealId,
			mealItemId: input.mealItemId,
		},
	});

	return {
		created: outcome.created,
		data: mealItemOverrideToDto(outcome.row),
	};
}

/**
 * Removes swap coverage.
 *
 * Without a date the whole slot is cleared. With one, only that day is taken
 * back — from the newest row covering it, so undoing today leaves an older
 * override still serving the days it owned.
 */
export async function deleteMemberMealItemOverride(
	ctx: Context,
	input: DeleteMealItemOverrideInput
): Promise<{ data: DeletedFlagDto }> {
	const user = requireSessionUser(ctx);
	const assignment = await requireAssignmentForUser(
		user.id,
		input.assignmentId,
		OVERRIDE_ACCESS_DENIED
	);

	await requireOverrideSlot({
		assignment,
		dietPlanMealId: input.dietPlanMealId,
	});

	const slot = {
		assignmentId: assignment.id,
		dietPlanMealId: input.dietPlanMealId,
		mealItemId: input.mealItemId,
	};

	if (input.date === undefined) {
		await deleteMealItemOverrideSlot(slot);
	} else {
		await deleteMealItemOverrideDate(slot, input.date);
	}

	return { data: { deleted: true } };
}
