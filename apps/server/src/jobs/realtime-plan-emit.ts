import { db } from "@brnit/db";
import { dietPlanAssignment, member } from "@brnit/db/schema";
import type { PlanChangedReason } from "@brnit/realtime";
import { eq } from "drizzle-orm";

import {
	emitAssessmentRecordedBestEffort,
	emitPlanChangedBestEffort,
} from "../sockets/realtime-emit.service.js";
import { createWorkerLogger } from "./worker-logger.js";

/**
 * Bridges domain writes to realtime events.
 *
 * Controllers know an assignment id or a `member.id`; the room a message goes
 * to is keyed on `user.id` and `organization.id`. Rather than make every call
 * site join those tables, this module resolves them once and emits — the same
 * job `qpadel/apps/server/src/jobs/realtime-booking-emit.ts` does.
 *
 * Everything here is fire-and-forget by construction: these run *after* a
 * handler has returned its DTO, so a failed lookup must never turn a
 * successful write into a failed request.
 */

const log = createWorkerLogger("realtime-plan-emit");

function runBestEffort(task: () => Promise<void>, context: object): void {
	task().catch((error: unknown) => {
		log.error({ err: error, ...context }, "realtime dispatch failed");
	});
}

/** `member` outlives the assignments pointing at it, so this survives a delete. */
async function resolveMemberUserId(memberId: string): Promise<string | null> {
	const rows = await db
		.select({ userId: member.userId })
		.from(member)
		.where(eq(member.id, memberId))
		.limit(1);

	return rows[0]?.userId ?? null;
}

/**
 * An assignment names either a `user` directly or a `member` row, never both
 * (`diet_plan_assignment_assignee_check`), so the member join is a LEFT JOIN
 * and the assignee is whichever side is populated.
 */
async function resolveAssignmentUserId(
	dietPlanAssignmentId: string
): Promise<string | null> {
	const rows = await db
		.select({
			directUserId: dietPlanAssignment.userId,
			memberUserId: member.userId,
		})
		.from(dietPlanAssignment)
		.leftJoin(member, eq(member.id, dietPlanAssignment.memberId))
		.where(eq(dietPlanAssignment.id, dietPlanAssignmentId))
		.limit(1);

	const row = rows[0];
	return row ? (row.directUserId ?? row.memberUserId) : null;
}

export interface PlanChangedDispatch {
	/** UTC calendar date, when the change is scoped to a single day. */
	readonly dateYmd?: string;
	readonly dietPlanAssignmentId: string;
	/**
	 * The assignment's `member.id`, the second half of the same escape hatch as
	 * {@link PlanChangedDispatch.userId} — and the half a delete actually needs.
	 * `createDietPlanAssignmentNutritionistInputSchema` makes `memberId`
	 * mandatory and does not accept `userId`, so every assignment a nutritionist
	 * can delete is member-scoped and its `userId` column is null; resolving one
	 * from the deleted DTO alone would always fail. The `member` row is not
	 * touched by the delete, so it still resolves afterwards.
	 *
	 * Nullable so a controller can forward a DTO field verbatim.
	 */
	readonly memberId?: string | null;
	readonly reason: PlanChangedReason;
	/**
	 * Skips the assignee lookup. Pass it when the assignment row is about to be
	 * deleted — after a `DELETE` there is nothing left to resolve, so a delete
	 * controller must either emit before deleting or supply this.
	 */
	readonly userId?: string | null;
}

/**
 * Resolution order is cheapest-first: an explicit `userId`, then the member the
 * assignment names, then the assignment row itself. The last step is the only
 * one available to callers that hold nothing but an assignment id (a
 * consumption write, a meal-item override), and the only one a delete cannot use.
 */
async function resolvePlanChangedUserId(
	dispatch: PlanChangedDispatch
): Promise<string | null> {
	if (dispatch.userId) {
		return dispatch.userId;
	}
	if (dispatch.memberId) {
		return await resolveMemberUserId(dispatch.memberId);
	}
	return await resolveAssignmentUserId(dispatch.dietPlanAssignmentId);
}

/** Tells the assigned member their Home screen is stale. */
export function emitPlanChangedForAssignmentBestEffort(
	dispatch: PlanChangedDispatch
): void {
	runBestEffort(
		async () => {
			const userId = await resolvePlanChangedUserId(dispatch);
			if (!userId) {
				log.warn(
					{ dietPlanAssignmentId: dispatch.dietPlanAssignmentId },
					"plan change not emitted; assignee could not be resolved"
				);
				return;
			}

			emitPlanChangedBestEffort({
				userId,
				dietPlanAssignmentId: dispatch.dietPlanAssignmentId,
				reason: dispatch.reason,
				...(dispatch.dateYmd ? { dateYmd: dispatch.dateYmd } : {}),
			});
		},
		{ dietPlanAssignmentId: dispatch.dietPlanAssignmentId }
	);
}

export interface AssessmentRecordedDispatch {
	/** ISO timestamp, as the assessment DTO already serializes it. */
	readonly assessedAt: string;
	readonly assessmentId: string;
	readonly memberId: string;
}

/**
 * Fans a newly recorded assessment out to the member and their organization's
 * staff. The organization comes from the `member` row rather than from the
 * request, so the event can never be addressed to the wrong org.
 */
export function emitAssessmentRecordedForMemberBestEffort(
	dispatch: AssessmentRecordedDispatch
): void {
	runBestEffort(
		async () => {
			const rows = await db
				.select({
					userId: member.userId,
					organizationId: member.organizationId,
				})
				.from(member)
				.where(eq(member.id, dispatch.memberId))
				.limit(1);

			const row = rows[0];
			if (!row) {
				log.warn(
					{ memberId: dispatch.memberId },
					"assessment not emitted; member row not found"
				);
				return;
			}

			emitAssessmentRecordedBestEffort({
				assessmentId: dispatch.assessmentId,
				memberId: dispatch.memberId,
				organizationId: row.organizationId,
				userId: row.userId,
				assessedAt: dispatch.assessedAt,
			});
		},
		{ memberId: dispatch.memberId }
	);
}
