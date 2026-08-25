import { z } from "zod";

/**
 * Emitted when a direct admin records a new body-composition assessment.
 *
 * Two rooms receive it: `user:<userId>` so the member's Stats screen refetches
 * its recent assessments, and `org:<organizationId>` so staff looking at the
 * member list — and the leaderboard, which a second assessment can reorder —
 * see it without a manual refresh.
 *
 * `memberId` and `userId` are both carried because the two audiences key on
 * different ids: the member's own screens are user-scoped, while every staff
 * screen is `member.id`-scoped.
 */
export const assessmentRecordedPayloadSchema = z.object({
	assessmentId: z.string().min(1),
	memberId: z.string().min(1),
	organizationId: z.string().min(1),
	userId: z.string().min(1),
	assessedAt: z.iso.datetime(),
});

export type AssessmentRecordedPayload = z.infer<
	typeof assessmentRecordedPayloadSchema
>;
