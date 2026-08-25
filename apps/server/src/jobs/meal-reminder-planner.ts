import { diffDaysInclusiveUTC, getTodayUtcDateString } from "@brnit/datetime";
import { db } from "@brnit/db";
import {
	dietPlanAssignment,
	dietPlanMeal,
	dietPlanMealTimeOverride,
	member,
} from "@brnit/db/schema";
import {
	type MealTimeOverrideRow,
	resolveMealTimeOverridesForDate,
} from "@brnit/domain";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import type { MealReminderJobPayload } from "./meal-reminder-contract.js";

/**
 * Works out which meal reminders a given UTC date needs.
 *
 * Pure read path — it enqueues nothing. Both producers use it: the daily cron
 * (whole day, every active assignment) and the post-write hook a controller
 * calls after an assignment or meal-time override changes (one assignment,
 * today).
 *
 * "Repeat all days" slots (`day_number = 0`) and day-specific slots are both
 * resolved here, exactly as the member Home read does — a reminder must fire
 * for what the member will actually see on that day.
 */

/** Plan day 0 means "repeats on every day of the plan". */
const REPEAT_EVERY_DAY = 0;

interface ActiveAssignmentRow {
	dietPlanId: string;
	endDate: string;
	id: string;
	startDate: string;
	userId: string | null;
}

async function listAssignmentsActiveOn(
	dateYmd: string,
	dietPlanAssignmentId?: string
): Promise<ActiveAssignmentRow[]> {
	const conditions = [
		lte(dietPlanAssignment.startDate, dateYmd),
		gte(dietPlanAssignment.endDate, dateYmd),
	];
	if (dietPlanAssignmentId) {
		conditions.push(eq(dietPlanAssignment.id, dietPlanAssignmentId));
	}

	// An assignment names either a `user` directly or a `member` row, never
	// both (`diet_plan_assignment_assignee_check`), so the member join is a
	// LEFT JOIN and the user id is whichever side is populated.
	const rows = await db
		.select({
			id: dietPlanAssignment.id,
			dietPlanId: dietPlanAssignment.dietPlanId,
			startDate: dietPlanAssignment.startDate,
			endDate: dietPlanAssignment.endDate,
			directUserId: dietPlanAssignment.userId,
			memberUserId: member.userId,
		})
		.from(dietPlanAssignment)
		.leftJoin(member, eq(member.id, dietPlanAssignment.memberId))
		.where(and(...conditions));

	return rows.map((row) => ({
		id: row.id,
		dietPlanId: row.dietPlanId,
		startDate: row.startDate,
		endDate: row.endDate,
		userId: row.directUserId ?? row.memberUserId,
	}));
}

interface PlanSlotRow {
	dayNumber: number;
	dietPlanId: string;
	id: string;
	mealType: string;
	scheduledTime: string | null;
}

async function listPlanSlots(planIds: string[]): Promise<PlanSlotRow[]> {
	if (planIds.length === 0) {
		return [];
	}
	return await db
		.select({
			id: dietPlanMeal.id,
			dietPlanId: dietPlanMeal.dietPlanId,
			dayNumber: dietPlanMeal.dayNumber,
			mealType: dietPlanMeal.mealType,
			scheduledTime: dietPlanMeal.scheduledTime,
		})
		.from(dietPlanMeal)
		.where(inArray(dietPlanMeal.dietPlanId, planIds));
}

type TimeOverrideRow = MealTimeOverrideRow & { dietPlanAssignmentId: string };

async function listTimeOverrides(
	assignmentIds: string[]
): Promise<TimeOverrideRow[]> {
	if (assignmentIds.length === 0) {
		return [];
	}
	return await db
		.select({
			dietPlanAssignmentId: dietPlanMealTimeOverride.dietPlanAssignmentId,
			dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
			effectiveDate: dietPlanMealTimeOverride.effectiveDate,
			scheduledTime: dietPlanMealTimeOverride.scheduledTime,
		})
		.from(dietPlanMealTimeOverride)
		.where(
			inArray(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentIds)
		);
}

function groupBy<Row, Key extends string>(
	rows: readonly Row[],
	keyOf: (row: Row) => Key
): Map<Key, Row[]> {
	const grouped = new Map<Key, Row[]>();
	for (const row of rows) {
		const key = keyOf(row);
		const bucket = grouped.get(key);
		if (bucket) {
			bucket.push(row);
		} else {
			grouped.set(key, [row]);
		}
	}
	return grouped;
}

function remindersForAssignment(args: {
	assignment: ActiveAssignmentRow;
	dateYmd: string;
	slots: readonly PlanSlotRow[];
	timeOverrides: readonly TimeOverrideRow[];
	today: string;
}): MealReminderJobPayload[] {
	const { assignment, dateYmd, slots, timeOverrides, today } = args;
	if (!assignment.userId) {
		return [];
	}

	// Day 1 is the assignment's start date — the same inclusive count the member
	// Home read uses to pick a day's slots.
	const planDay = diffDaysInclusiveUTC(assignment.startDate, dateYmd);
	const resolvedTimes = resolveMealTimeOverridesForDate(
		timeOverrides,
		dateYmd,
		today
	);

	const reminders: MealReminderJobPayload[] = [];
	for (const slot of slots) {
		if (slot.dayNumber !== REPEAT_EVERY_DAY && slot.dayNumber !== planDay) {
			continue;
		}
		const scheduledTime = resolvedTimes.get(slot.id) ?? slot.scheduledTime;
		// A slot with no time — the plan never set one and no override did
		// either — has nothing to remind about. Most plans are like this.
		if (!scheduledTime) {
			continue;
		}
		reminders.push({
			dietPlanAssignmentId: assignment.id,
			dietPlanMealId: slot.id,
			userId: assignment.userId,
			dateYmd,
			scheduledTime,
			mealType: slot.mealType,
		});
	}
	return reminders;
}

export interface PlanMealRemindersOptions {
	/** Limit planning to one assignment — used by the post-write hook. */
	readonly dietPlanAssignmentId?: string;
	/**
	 * "Today" for future-only meal-time override resolution. Injectable so the
	 * planner stays testable; production always means the real UTC today.
	 */
	readonly today?: string;
}

/**
 * Every reminder that should exist for `dateYmd`, override-aware.
 *
 * Three queries regardless of how many assignments are active: the assignments,
 * their plans' slots, and their meal-time overrides. Slot selection and time
 * resolution then happen in memory, so the per-assignment plan-day arithmetic
 * costs no extra round trips.
 */
export async function planMealRemindersForDate(
	dateYmd: string,
	options: PlanMealRemindersOptions = {}
): Promise<MealReminderJobPayload[]> {
	const assignments = await listAssignmentsActiveOn(
		dateYmd,
		options.dietPlanAssignmentId
	);
	if (assignments.length === 0) {
		return [];
	}

	const [slots, timeOverrides] = await Promise.all([
		listPlanSlots([...new Set(assignments.map((row) => row.dietPlanId))]),
		listTimeOverrides(assignments.map((row) => row.id)),
	]);

	const slotsByPlanId = groupBy(slots, (row) => row.dietPlanId);
	const overridesByAssignmentId = groupBy(
		timeOverrides,
		(row) => row.dietPlanAssignmentId
	);
	const today = options.today ?? getTodayUtcDateString();

	return assignments.flatMap((assignment) =>
		remindersForAssignment({
			assignment,
			dateYmd,
			slots: slotsByPlanId.get(assignment.dietPlanId) ?? [],
			timeOverrides: overridesByAssignmentId.get(assignment.id) ?? [],
			today,
		})
	);
}
