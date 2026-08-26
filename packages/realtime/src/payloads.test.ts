import { describe, expect, it } from "bun:test";

import {
	assessmentRecordedPayloadSchema,
	joinRoomPayloadSchema,
	planChangedPayloadSchema,
} from "./index";

describe("planChangedPayloadSchema", () => {
	it.each([
		{
			name: "a range_wide change",
			payload: {
				userId: "usr_1",
				dietPlanAssignmentId: "asg_1",
				reason: "assignment_changed" as const,
			},
		},
		{
			name: "a day_scoped change",
			payload: {
				userId: "usr_1",
				dietPlanAssignmentId: "asg_1",
				reason: "consumption_changed" as const,
				dateYmd: "2026-08-25",
			},
		},
	])("round_trips_$name", ({ payload }) => {
		expect(planChangedPayloadSchema.parse(payload)).toEqual(payload);
	});

	it("rejects_a_non_calendar_date", () => {
		const parsed = planChangedPayloadSchema.safeParse({
			userId: "usr_1",
			dietPlanAssignmentId: "asg_1",
			reason: "consumption_changed",
			dateYmd: "2026-08-25T00:00:00.000Z",
		});
		expect(parsed.success).toBe(false);
	});

	it("rejects_an_unknown_reason", () => {
		const parsed = planChangedPayloadSchema.safeParse({
			userId: "usr_1",
			dietPlanAssignmentId: "asg_1",
			reason: "member_logged_a_meal",
		});
		expect(parsed.success).toBe(false);
	});
});

describe("assessmentRecordedPayloadSchema", () => {
	it("round_trips_a_valid_payload", () => {
		const payload = {
			assessmentId: "ass_1",
			memberId: "mem_1",
			organizationId: "org_1",
			userId: "usr_1",
			assessedAt: "2026-08-25T09:30:00.000Z",
		};
		expect(assessmentRecordedPayloadSchema.parse(payload)).toEqual(payload);
	});

	it("rejects_a_calendar_date_for_assessedAt", () => {
		const parsed = assessmentRecordedPayloadSchema.safeParse({
			assessmentId: "ass_1",
			memberId: "mem_1",
			organizationId: "org_1",
			userId: "usr_1",
			assessedAt: "2026-08-25",
		});
		expect(parsed.success).toBe(false);
	});
});

describe("joinRoomPayloadSchema", () => {
	it("rejects_an_empty_room", () => {
		expect(joinRoomPayloadSchema.safeParse({ room: "" }).success).toBe(false);
	});
});
