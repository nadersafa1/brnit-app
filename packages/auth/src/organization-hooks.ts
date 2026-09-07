/**
 * Better Auth `organization` plugin hooks: authorization and invitation expiry.
 *
 * Persistence and transactional integrity stay inside Better Auth — these
 * callbacks only decide whether the operation may proceed, using the rules from
 * `@brnit/domain`.
 *
 * The factory takes the org-role lookup as a function rather than a database
 * client (qpadel injects the client itself) so the decision logic can be tested
 * without a database, and so the exact `(userId, organizationId)` pair each hook
 * asks about is observable.
 */
import type { DbClient } from "@brnit/db";
import { member as memberTable } from "@brnit/db/schema/auth";
import {
	canInviteWithAnyRole,
	canUpdateMemberRole,
	isAppAdmin,
	ORGANIZATION_MEMBER_ROLE,
} from "@brnit/domain";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";

/** Every invitation expires seven days after it is created. */
const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

const INVITE_FORBIDDEN =
	"Only org owners, direct admins, or app admins can invite with non-member roles";
const UPDATE_ROLE_FORBIDDEN =
	"Only app admins, org owners, or direct admins can change member roles";

/** Resolves one user's `member.role` in one organization, or `null` if not a member. */
export type OrgRoleLookup = (
	userId: string,
	organizationId: string
) => Promise<string | null>;

interface HookActor {
	id: string;
	role?: string | null | undefined;
	[key: string]: unknown;
}

interface HookInvitation {
	email: string;
	inviterId: string;
	organizationId: string;
	role?: string | null | undefined;
	[key: string]: unknown;
}

interface HookOrganization {
	id: string;
	[key: string]: unknown;
}

/** The production lookup, reading `member.role` through Drizzle. */
export function createOrgRoleLookup(db: DbClient): OrgRoleLookup {
	return async (userId, organizationId) => {
		const membership = await db.query.member.findFirst({
			columns: { role: true },
			where: and(
				eq(memberTable.userId, userId),
				eq(memberTable.organizationId, organizationId)
			),
		});
		return membership?.role ?? null;
	};
}

export function createOrganizationHooks(orgRoleForUser: OrgRoleLookup) {
	return {
		/**
		 * App admins may invite with any role. Everyone else may only send a
		 * `member` invitation unless their org role is `owner` or `direct_admin`.
		 * Either way the invitation is stamped with a 7-day expiry.
		 */
		beforeCreateInvitation: async ({
			invitation,
			inviter,
		}: {
			invitation: HookInvitation;
			inviter: HookActor;
		}) => {
			const expiresAt = new Date(Date.now() + INVITATION_VALIDITY_MS);

			if (isAppAdmin(inviter.role)) {
				return { data: { ...invitation, expiresAt } };
			}

			if (invitation.role !== ORGANIZATION_MEMBER_ROLE) {
				const orgRole = await orgRoleForUser(
					inviter.id,
					invitation.organizationId
				);
				if (!canInviteWithAnyRole({ appRole: null, orgRole })) {
					throw new APIError("BAD_REQUEST", { message: INVITE_FORBIDDEN });
				}
			}

			return { data: { ...invitation, expiresAt } };
		},

		/**
		 * App admins may change any member's role. Everyone else needs an org role
		 * of `owner` or `direct_admin`; `client_admin` is deliberately excluded.
		 */
		beforeUpdateMemberRole: async ({
			organization,
			user: actor,
		}: {
			organization: HookOrganization;
			user: HookActor;
		}): Promise<void> => {
			if (isAppAdmin(actor.role)) {
				return;
			}

			const orgRole = await orgRoleForUser(actor.id, organization.id);
			if (!canUpdateMemberRole({ appRole: null, orgRole })) {
				throw new APIError("FORBIDDEN", { message: UPDATE_ROLE_FORBIDDEN });
			}
		},
	};
}
