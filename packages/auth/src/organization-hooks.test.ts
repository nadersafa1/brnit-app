import { describe, expect, it } from "bun:test";

import {
	createOrganizationHooks,
	type OrgRoleLookup,
} from "./organization-hooks";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Records every `(userId, organizationId)` the hooks ask about. */
function stubLookup(role: string | null) {
	const calls: [string, string][] = [];
	const lookup: OrgRoleLookup = (userId, organizationId) => {
		calls.push([userId, organizationId]);
		return Promise.resolve(role);
	};
	return { calls, lookup };
}

const invitation = {
	email: "invitee@example.com",
	inviterId: "user_1",
	organizationId: "org_1",
	role: "direct_admin",
};

describe("beforeCreateInvitation", () => {
	it("stamps every invitation with a seven-day expiry", async () => {
		const { lookup } = stubLookup("owner");
		const before = Date.now();

		const result = await createOrganizationHooks(lookup).beforeCreateInvitation(
			{
				invitation,
				inviter: { id: "user_1", role: "user" },
			}
		);

		const expiresAt = result.data.expiresAt as Date;
		expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(SEVEN_DAYS_MS);
		expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(SEVEN_DAYS_MS);
	});

	it("passes the rest of the invitation through untouched", async () => {
		const { lookup } = stubLookup("owner");

		const result = await createOrganizationHooks(lookup).beforeCreateInvitation(
			{
				invitation,
				inviter: { id: "user_1", role: "user" },
			}
		);

		expect(result.data).toMatchObject(invitation);
	});

	it("lets an app admin invite any role without touching the database", async () => {
		const { calls, lookup } = stubLookup(null);

		await createOrganizationHooks(lookup).beforeCreateInvitation({
			invitation,
			inviter: { id: "user_1", role: "admin" },
		});

		expect(calls).toHaveLength(0);
	});

	it("lets anyone invite a plain member without touching the database", async () => {
		const { calls, lookup } = stubLookup(null);

		await createOrganizationHooks(lookup).beforeCreateInvitation({
			invitation: { ...invitation, role: "member" },
			inviter: { id: "user_1", role: "user" },
		});

		expect(calls).toHaveLength(0);
	});

	it("looks the inviter up in the organization being invited to", async () => {
		const { calls, lookup } = stubLookup("owner");

		await createOrganizationHooks(lookup).beforeCreateInvitation({
			invitation,
			inviter: { id: "user_1", role: "user" },
		});

		expect(calls).toEqual([["user_1", "org_1"]]);
	});

	it("allows an org owner or direct admin to invite a non-member role", async () => {
		for (const orgRole of ["owner", "direct_admin"]) {
			const { lookup } = stubLookup(orgRole);
			const result = await createOrganizationHooks(
				lookup
			).beforeCreateInvitation({
				invitation,
				inviter: { id: "user_1", role: "user" },
			});
			expect(result.data).toMatchObject({ role: "direct_admin" });
		}
	});

	it("rejects a client_admin inviting a non-member role", async () => {
		const { lookup } = stubLookup("client_admin");

		await expect(
			createOrganizationHooks(lookup).beforeCreateInvitation({
				invitation,
				inviter: { id: "user_1", role: "user" },
			})
		).rejects.toMatchObject({ status: "BAD_REQUEST" });
	});

	it("rejects a non-member of the organization", async () => {
		const { lookup } = stubLookup(null);

		await expect(
			createOrganizationHooks(lookup).beforeCreateInvitation({
				invitation,
				inviter: { id: "user_1", role: "user" },
			})
		).rejects.toMatchObject({ status: "BAD_REQUEST" });
	});
});

describe("beforeUpdateMemberRole", () => {
	it("lets an app admin through without touching the database", async () => {
		const { calls, lookup } = stubLookup(null);

		await createOrganizationHooks(lookup).beforeUpdateMemberRole({
			organization: { id: "org_1" },
			user: { id: "user_1", role: "admin" },
		});

		expect(calls).toHaveLength(0);
	});

	it("looks the actor up in the organization being changed", async () => {
		const { calls, lookup } = stubLookup("owner");

		await createOrganizationHooks(lookup).beforeUpdateMemberRole({
			organization: { id: "org_2" },
			user: { id: "user_9", role: "user" },
		});

		expect(calls).toEqual([["user_9", "org_2"]]);
	});

	it("allows an org owner or direct admin", async () => {
		for (const orgRole of ["owner", "direct_admin"]) {
			const { lookup } = stubLookup(orgRole);
			await expect(
				createOrganizationHooks(lookup).beforeUpdateMemberRole({
					organization: { id: "org_1" },
					user: { id: "user_1", role: "user" },
				})
			).resolves.toBeUndefined();
		}
	});

	it("rejects a client_admin with FORBIDDEN, not BAD_REQUEST", async () => {
		const { lookup } = stubLookup("client_admin");

		await expect(
			createOrganizationHooks(lookup).beforeUpdateMemberRole({
				organization: { id: "org_1" },
				user: { id: "user_1", role: "user" },
			})
		).rejects.toMatchObject({ status: "FORBIDDEN" });
	});

	it("rejects a non-member of the organization", async () => {
		const { lookup } = stubLookup(null);

		await expect(
			createOrganizationHooks(lookup).beforeUpdateMemberRole({
				organization: { id: "org_1" },
				user: { id: "user_1", role: "user" },
			})
		).rejects.toMatchObject({ status: "FORBIDDEN" });
	});
});
