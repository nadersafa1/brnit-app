import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { AssessmentRow } from "../assessment/queries";
import type { Context } from "../context";

// Environment placeholders live in `test-setup.ts`, preloaded via bunfig —
// see the note there about the env module freezing on first import.

const ORGANIZATION = { id: "org-1", name: "Org One" };

function assessmentRow(overrides: Partial<AssessmentRow> = {}): AssessmentRow {
	return {
		assessedAt: new Date("2026-03-01T00:00:00.000Z"),
		bmi: "23.10",
		bodyFatPercent: "22.00",
		bodyWaterL: "42.00",
		createdAt: new Date("2026-03-01T00:00:00.000Z"),
		heightCm: "180.00",
		id: "assessment-1",
		imagePublicId: null,
		memberId: "mem-1",
		muscleMassKg: "35.00",
		recordedById: "user-1",
		updatedAt: new Date("2026-03-01T00:00:00.000Z"),
		visceralFatAreaCm2: "80.00",
		weightKg: "75.00",
		...overrides,
	};
}

const state: {
	belongsToOrganization: boolean;
	calls: string[];
	existing: AssessmentRow | null;
	memberAssessment: AssessmentRow | null;
	memberOrganizationId: string | null;
	memberships: {
		memberId: string;
		organization: { id: string; name: string };
	}[];
	recentRows: AssessmentRow[];
} = {
	belongsToOrganization: true,
	calls: [],
	existing: assessmentRow(),
	memberAssessment: assessmentRow(),
	memberOrganizationId: ORGANIZATION.id,
	memberships: [],
	recentRows: [],
};

mock.module("../assessment/queries", () => ({
	assessmentBelongsToOrganization: () =>
		Promise.resolve(state.belongsToOrganization),
	deleteAssessment: (id: string) => {
		state.calls.push(`deleteAssessment:${id}`);
		return Promise.resolve();
	},
	findAssessmentById: () => Promise.resolve(state.existing),
	findAssessmentForMember: () => Promise.resolve(state.memberAssessment),
	findMemberOrganizationId: () => Promise.resolve(state.memberOrganizationId),
	insertAssessment: (values: Record<string, unknown>) => {
		state.calls.push("insertAssessment");
		return Promise.resolve(assessmentRow(values as Partial<AssessmentRow>));
	},
	listAssessmentsForOrganization: (input: { memberId?: string }) => {
		state.calls.push(`listAssessmentsForOrganization:${input.memberId}`);
		return Promise.resolve({ items: [assessmentRow()], totalItems: 1 });
	},
	listMembershipsWithOrganization: () => Promise.resolve(state.memberships),
	listRecentAssessmentsForMembers: () => Promise.resolve(state.recentRows),
	updateAssessment: (id: string, values: Record<string, unknown>) =>
		Promise.resolve(
			state.existing
				? assessmentRow({ ...state.existing, ...(values as object), id })
				: null
		),
}));

mock.module("../cloudinary/assets", () => ({
	deleteCloudinaryImage: (publicId: string | null) => {
		state.calls.push(`deleteCloudinaryImage:${publicId}`);
		return Promise.resolve(true);
	},
	uploadFileToCloudinary: (_file: Buffer, folder: string) => {
		state.calls.push(`uploadFileToCloudinary:${folder}`);
		return Promise.resolve(`${folder}/uploaded`);
	},
}));

mock.module("../member/member-access", () => ({
	assignmentAssigneeCondition: () => undefined,
	getUserMemberIds: () => Promise.resolve([]),
	NO_ORGANIZATION_ERROR_CODE: "NO_ORGANIZATION",
	NOT_MEMBER_ERROR_CODE: "NOT_MEMBER",
	requireMemberOrganization: () =>
		Promise.resolve({
			memberId: "mem-1",
			organization: ORGANIZATION,
			organizationId: ORGANIZATION.id,
		}),
}));

const { HttpError } = await import("../http-error");
const {
	createBodyCompositionAssessment,
	deleteBodyCompositionAssessment,
	getBodyCompositionAssessment,
	getMemberAssessment,
	listMemberRecentAssessments,
	updateBodyCompositionAssessment,
} = await import("./assessment");

function buildContext(overrides: Partial<Context> = {}): Context {
	return {
		headers: {},
		memberId: null,
		organization: null,
		organizationId: ORGANIZATION.id,
		session: null,
		user: { id: "user-1" },
		...overrides,
	} as unknown as Context;
}

const createInput = {
	assessedAt: "2026-03-01T00:00:00.000Z",
	bmi: 23.1,
	bodyFatPercent: 22,
	bodyWaterL: 42,
	heightCm: 180,
	memberId: "mem-1",
	muscleMassKg: 35,
	visceralFatAreaCm2: 80,
	weightKg: 75,
};

async function expectHttpError(
	action: Promise<unknown>,
	status: number,
	message: string
): Promise<void> {
	let thrown: unknown;
	try {
		await action;
	} catch (error) {
		thrown = error;
	}
	expect(thrown).toBeInstanceOf(HttpError);
	expect((thrown as InstanceType<typeof HttpError>).status).toBe(status);
	expect((thrown as InstanceType<typeof HttpError>).message).toBe(message);
}

beforeEach(() => {
	state.belongsToOrganization = true;
	state.calls = [];
	state.existing = assessmentRow();
	state.memberAssessment = assessmentRow();
	state.memberOrganizationId = ORGANIZATION.id;
	state.memberships = [];
	state.recentRows = [];
});

describe("createBodyCompositionAssessment", () => {
	it("404s when the member does not exist", async () => {
		state.memberOrganizationId = null;

		await expectHttpError(
			createBodyCompositionAssessment(buildContext(), createInput),
			404,
			"Member not found"
		);
		expect(state.calls).toEqual([]);
	});

	it("403s when the member belongs to another organization", async () => {
		state.memberOrganizationId = "org-other";

		await expectHttpError(
			createBodyCompositionAssessment(buildContext(), createInput),
			403,
			"Member does not belong to this organization"
		);
	});

	it("rejects a wrong-org member before uploading anything", async () => {
		state.memberOrganizationId = "org-other";

		await expectHttpError(
			createBodyCompositionAssessment(buildContext(), {
				...createInput,
				file: Buffer.from("image"),
			}),
			403,
			"Member does not belong to this organization"
		);
		// No orphaned Cloudinary asset.
		expect(state.calls).toEqual([]);
	});

	it("403s when no organization is resolved", async () => {
		await expectHttpError(
			createBodyCompositionAssessment(
				buildContext({ organizationId: null }),
				createInput
			),
			403,
			"Forbidden: active organization required for this operation"
		);
	});

	it("403s when the caller's organization role cannot write", async () => {
		const ctx = buildContext({
			organization: {
				activeOrgId: ORGANIZATION.id,
				isAppAdmin: false,
				isAuthenticated: true,
				isClientAdmin: false,
				isCoach: false,
				isDirectAdmin: false,
				isMember: true,
				isNutritionist: false,
				isOwner: false,
				organization: null,
				role: "member",
				userId: "user-1",
			},
		});

		await expectHttpError(
			createBodyCompositionAssessment(ctx, createInput),
			403,
			"Forbidden: direct admin, owner, or app admin role required"
		);
	});

	it("records the caller as the recorder and uploads the image", async () => {
		const result = await createBodyCompositionAssessment(buildContext(), {
			...createInput,
			file: Buffer.from("image"),
		});

		expect(state.calls).toEqual([
			"uploadFileToCloudinary:body-composition-assessments",
			"insertAssessment",
		]);
		expect(result.data.recordedById).toBe("user-1");
		expect(result.data.imageUrl).toBe(
			`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/body-composition-assessments/uploaded`
		);
		// Metrics stay strings for the staff-facing shape, and the public id
		// never reaches the client.
		expect(result.data.heightCm).toBe("180");
		expect(result.data).not.toHaveProperty("imagePublicId");
	});
});

describe("organization scoping of a single assessment", () => {
	it("403s when the assessment belongs to another organization", async () => {
		state.belongsToOrganization = false;

		await expectHttpError(
			getBodyCompositionAssessment(buildContext(), { id: "assessment-1" }),
			403,
			"Assessment does not belong to this organization"
		);
	});

	it("404s when the assessment does not exist at all", async () => {
		state.belongsToOrganization = false;
		state.existing = null;

		await expectHttpError(
			getBodyCompositionAssessment(buildContext(), { id: "missing" }),
			404,
			"Assessment not found"
		);
	});

	it("404s when the scope check passes but the row is gone", async () => {
		state.existing = null;

		await expectHttpError(
			getBodyCompositionAssessment(buildContext(), { id: "assessment-1" }),
			404,
			"Assessment not found"
		);
	});

	it("returns the assessment when it is in scope", async () => {
		const result = await getBodyCompositionAssessment(buildContext(), {
			id: "assessment-1",
		});

		expect(result.data.id).toBe("assessment-1");
		expect(result.data.imageUrl).toBeNull();
	});
});

describe("updateBodyCompositionAssessment", () => {
	it("403s across organizations before touching the image", async () => {
		state.belongsToOrganization = false;

		await expectHttpError(
			updateBodyCompositionAssessment(buildContext(), {
				clearImage: true,
				id: "assessment-1",
			}),
			403,
			"Assessment does not belong to this organization"
		);
		expect(state.calls).toEqual([]);
	});

	it("400s when nothing was sent", async () => {
		await expectHttpError(
			updateBodyCompositionAssessment(buildContext(), {
				clearImage: false,
				id: "assessment-1",
			}),
			400,
			"At least one field, file, or clearImage must be provided for update"
		);
	});

	it("destroys the previous asset before uploading a replacement", async () => {
		state.existing = assessmentRow({ imagePublicId: "old-public-id" });

		await updateBodyCompositionAssessment(buildContext(), {
			clearImage: false,
			file: Buffer.from("image"),
			id: "assessment-1",
		});

		expect(state.calls).toEqual([
			"deleteCloudinaryImage:old-public-id",
			"uploadFileToCloudinary:body-composition-assessments",
		]);
	});

	it("clears the image without uploading anything", async () => {
		state.existing = assessmentRow({ imagePublicId: "old-public-id" });

		await updateBodyCompositionAssessment(buildContext(), {
			clearImage: true,
			file: Buffer.from("image"),
			id: "assessment-1",
		});

		// `clearImage` wins over an attached file.
		expect(state.calls).toEqual(["deleteCloudinaryImage:old-public-id"]);
	});
});

describe("deleteBodyCompositionAssessment", () => {
	it("403s across organizations", async () => {
		state.belongsToOrganization = false;

		await expectHttpError(
			deleteBodyCompositionAssessment(buildContext(), { id: "assessment-1" }),
			403,
			"Assessment does not belong to this organization"
		);
		expect(state.calls).toEqual([]);
	});

	it("removes the Cloudinary asset before the row", async () => {
		state.existing = assessmentRow({ imagePublicId: "old-public-id" });

		const result = await deleteBodyCompositionAssessment(buildContext(), {
			id: "assessment-1",
		});

		expect(state.calls).toEqual([
			"deleteCloudinaryImage:old-public-id",
			"deleteAssessment:assessment-1",
		]);
		expect(result).toEqual({ data: { deleted: true } });
	});
});

describe("getMemberAssessment", () => {
	it("404s when the assessment is not the caller's", async () => {
		state.memberAssessment = null;

		await expectHttpError(
			getMemberAssessment(buildContext(), {
				id: "assessment-1",
				orgId: ORGANIZATION.id,
			}),
			404,
			"Assessment not found"
		);
	});

	it("normalizes metrics and attaches the organization", async () => {
		const result = await getMemberAssessment(buildContext(), {
			id: "assessment-1",
			orgId: ORGANIZATION.id,
		});

		expect(result.data.bodyFatPercent).toBe(22);
		expect(result.data.heightCm).toBe(180);
		expect(result.data.organization).toEqual(ORGANIZATION);
		expect(result.data.assessedAt).toBe("2026-03-01T00:00:00.000Z");
	});
});

describe("listMemberRecentAssessments", () => {
	it("scopes to the caller's own member row when an organization is named", async () => {
		const result = await listMemberRecentAssessments(buildContext(), {
			limit: 5,
			orgId: ORGANIZATION.id,
		});

		// The member id comes from the proven membership, never from the query.
		expect(state.calls).toEqual(["listAssessmentsForOrganization:mem-1"]);
		expect(result.organization).toEqual(ORGANIZATION);
		expect(result.assessments).toHaveLength(1);
		expect(result.assessments[0]?.organization).toEqual(ORGANIZATION);
		expect(result.assessments[0]?.bodyFatPercent).toBe(22);
	});

	it("spans every membership when no organization is named", async () => {
		state.memberships = [
			{ memberId: "mem-1", organization: ORGANIZATION },
			{ memberId: "mem-2", organization: { id: "org-2", name: "Org Two" } },
		];
		state.recentRows = [
			assessmentRow({ id: "a-1", memberId: "mem-2" }),
			assessmentRow({ id: "a-2", memberId: "mem-1" }),
		];

		const result = await listMemberRecentAssessments(buildContext(), {
			limit: 5,
		});

		expect(result.organization).toBeNull();
		expect(result.assessments.map((entry) => entry.organization.name)).toEqual([
			"Org Two",
			"Org One",
		]);
	});

	it("returns nothing when the user has no memberships at all", async () => {
		const result = await listMemberRecentAssessments(buildContext(), {
			limit: 5,
		});

		expect(result).toEqual({ assessments: [], organization: null });
	});
});
