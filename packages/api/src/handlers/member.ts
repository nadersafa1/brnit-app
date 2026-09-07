import type { Context } from "../context";
import { requireContextUser } from "../context";
import { loadConsumptionStreak } from "../member/consumption-streak";
import { loadCurrentDietPlan } from "../member/current-diet-plan";
import type {
	ConsumptionStreakDto,
	CurrentDietPlanDto,
	OrganizationLeaderboardDto,
} from "../member/dto";
import { requireMemberOrganization } from "../member/member-access";
import { loadOrganizationLeaderboard } from "../member/organization-leaderboard";
import type {
	CurrentDietPlanInput,
	OrganizationLeaderboardInput,
} from "../member/schemas";

/**
 * Handlers for `/member/me/**` reads.
 *
 * Each one re-derives the caller's identity from the context rather than
 * trusting an id passed in: a member may only ever read their own plan,
 * streak and leaderboard position.
 */

/**
 * The member Home read. Resolves the assignment covering `from` (else the
 * earliest one) and returns one entry per date in the requested window that
 * also falls inside the assignment.
 */
export async function getCurrentDietPlan(
	ctx: Context,
	input: CurrentDietPlanInput
): Promise<CurrentDietPlanDto> {
	const user = requireContextUser(ctx);
	return await loadCurrentDietPlan(user.id, input);
}

/** Consecutive logged days ending today; 0 when today has no logged meal. */
export async function getConsumptionStreak(
	ctx: Context
): Promise<ConsumptionStreakDto> {
	const user = requireContextUser(ctx);
	return await loadConsumptionStreak(user.id);
}

/**
 * Top three fat-loss members plus the caller's own standing.
 *
 * Membership is re-proved here — the handler resolves the organization from
 * `?orgId`, the guard's scope, or the session's active organization, and
 * refuses to answer for an organization the caller does not belong to.
 */
export async function getOrganizationLeaderboard(
	ctx: Context,
	input: OrganizationLeaderboardInput
): Promise<OrganizationLeaderboardDto> {
	const user = requireContextUser(ctx);
	const organizationId =
		input.orgId ??
		ctx.organizationId ??
		ctx.session?.activeOrganizationId ??
		null;
	const scope = await requireMemberOrganization(user.id, organizationId);
	return await loadOrganizationLeaderboard(scope);
}
