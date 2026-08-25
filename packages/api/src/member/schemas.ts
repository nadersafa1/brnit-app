import { diffDaysInclusiveUTC, isUtcDateString } from "@brnit/datetime";
import { z } from "zod";

/**
 * Input schemas for the member read surface.
 *
 * Values arrive from `req.query` as strings, so nothing here coerces numbers —
 * the only inputs are calendar dates and an organization id.
 */

const MIN_RANGE_DAYS = 1;
const MAX_RANGE_DAYS = 31;
const MAX_ORG_ID_LENGTH = 64;

const utcDateSchema = z
	.string()
	.refine(isUtcDateString, "Date must be a valid YYYY-MM-DD calendar date");

/**
 * `?from` / `?to` for the Home read. Both optional: the handler defaults
 * `from` to today (UTC) and `to` to `from + 6d`, matching the week strip.
 */
export const currentDietPlanQuerySchema = z
	.object({
		from: utcDateSchema.optional(),
		to: utcDateSchema.optional(),
	})
	.refine((value) => !(value.from && value.to) || value.from <= value.to, {
		message: "from must be before or equal to to",
		path: ["to"],
	})
	.refine(
		(value) => {
			if (!(value.from && value.to)) {
				return true;
			}
			const days = diffDaysInclusiveUTC(value.from, value.to);
			return days >= MIN_RANGE_DAYS && days <= MAX_RANGE_DAYS;
		},
		{
			message: `Range must be between ${MIN_RANGE_DAYS} and ${MAX_RANGE_DAYS} days`,
			path: ["to"],
		}
	);

export type CurrentDietPlanInput = z.infer<typeof currentDietPlanQuerySchema>;

/**
 * `?orgId` for the leaderboard. Absent means "the session's active
 * organization", which the handler resolves and re-checks membership against.
 */
export const organizationLeaderboardQuerySchema = z.object({
	orgId: z.string().min(1).max(MAX_ORG_ID_LENGTH).optional(),
});

export type OrganizationLeaderboardInput = z.infer<
	typeof organizationLeaderboardQuerySchema
>;
