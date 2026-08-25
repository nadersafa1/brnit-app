import { describe, expect, it } from "bun:test";

import type {
	ActiveAssignmentRow,
	PlanSlotRow,
	TimeOverrideRow,
} from "./meal-reminder-planner.js";
import { selectMealRemindersForDay } from "./meal-reminder-planner.js";

const assignment: ActiveAssignmentRow = {
	id: "asg_1",
	dietPlanId: "plan_1",
	startDate: "2026-08-24",
	endDate: "2026-08-30",
	userId: "usr_1",
};

function slot(overrides: Partial<PlanSlotRow> = {}): PlanSlotRow {
	return {
		id: "meal_1",
		dietPlanId: "plan_1",
		dayNumber: 0,
		mealType: "Breakfast",
		scheduledTime: "08:00",
		...overrides,
	};
}

function select(args: {
	dateYmd?: string;
	slots: PlanSlotRow[];
	timeOverrides?: TimeOverrideRow[];
	today?: string;
	assignment?: ActiveAssignmentRow;
}) {
	return selectMealRemindersForDay({
		assignment: args.assignment ?? assignment,
		dateYmd: args.dateYmd ?? "2026-08-25",
		slots: args.slots,
		timeOverrides: args.timeOverrides ?? [],
		today: args.today ?? "2026-08-25",
	});
}

describe("selectMealRemindersForDay", () => {
	it("includes_a_day_zero_slot_on_every_day", () => {
		const reminders = select({ slots: [slot({ dayNumber: 0 })] });

		expect(reminders).toEqual([
			{
				dietPlanAssignmentId: "asg_1",
				dietPlanMealId: "meal_1",
				userId: "usr_1",
				dateYmd: "2026-08-25",
				scheduledTime: "08:00",
				mealType: "Breakfast",
			},
		]);
	});

	it("includes_a_day_specific_slot_only_on_its_plan_day", () => {
		// startDate 2026-08-24 is plan day 1, so 2026-08-25 is plan day 2.
		expect(select({ slots: [slot({ dayNumber: 2 })] })).toHaveLength(1);
		expect(select({ slots: [slot({ dayNumber: 3 })] })).toHaveLength(0);
	});

	it("drops_a_slot_the_plan_never_gave_a_time", () => {
		expect(select({ slots: [slot({ scheduledTime: null })] })).toHaveLength(0);
	});

	it("prefers_an_exact_date_override_over_the_plan_time", () => {
		const reminders = select({
			slots: [slot()],
			timeOverrides: [
				{
					dietPlanAssignmentId: "asg_1",
					dietPlanMealId: "meal_1",
					effectiveDate: "2026-08-25",
					scheduledTime: "09:45",
				},
			],
		});

		expect(reminders[0]?.scheduledTime).toBe("09:45");
	});

	it("applies_a_future_only_override_from_today_onwards", () => {
		const futureOnly: TimeOverrideRow = {
			dietPlanAssignmentId: "asg_1",
			dietPlanMealId: "meal_1",
			effectiveDate: null,
			scheduledTime: "10:15",
		};

		expect(
			select({
				slots: [slot()],
				timeOverrides: [futureOnly],
				dateYmd: "2026-08-26",
				today: "2026-08-25",
			})[0]?.scheduledTime
		).toBe("10:15");

		// A future-only change must not rewrite a past day.
		expect(
			select({
				slots: [slot()],
				timeOverrides: [futureOnly],
				dateYmd: "2026-08-24",
				today: "2026-08-25",
			})[0]?.scheduledTime
		).toBe("08:00");
	});

	it("gives_a_slot_a_time_even_when_the_plan_had_none", () => {
		const reminders = select({
			slots: [slot({ scheduledTime: null })],
			timeOverrides: [
				{
					dietPlanAssignmentId: "asg_1",
					dietPlanMealId: "meal_1",
					effectiveDate: "2026-08-25",
					scheduledTime: "07:00",
				},
			],
		});

		expect(reminders[0]?.scheduledTime).toBe("07:00");
	});

	it("skips_an_assignment_whose_assignee_could_not_be_resolved", () => {
		expect(
			select({
				slots: [slot()],
				assignment: { ...assignment, userId: null },
			})
		).toHaveLength(0);
	});
});
