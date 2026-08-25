import type {
	AssessmentDto,
	MemberAssessmentDto,
	MemberRecentAssessmentsDto,
} from "../assessment/dto";
import { assessmentToDto, assessmentToMemberDto } from "../assessment/dto";
import type {
	AssessmentRow,
	AssessmentUpdateValues,
} from "../assessment/queries";
import {
	assessmentBelongsToOrganization,
	deleteAssessment,
	findAssessmentById,
	findAssessmentForMember,
	findMemberOrganizationId,
	insertAssessment,
	listAssessmentsForOrganization,
	listMembershipsWithOrganization,
	listRecentAssessmentsForMembers,
	updateAssessment,
} from "../assessment/queries";
import type {
	AssessmentParams,
	CreateAssessmentInput,
	ListAssessmentsInput,
	MemberAssessmentInput,
	MemberRecentAssessmentsInput,
	UpdateAssessmentInput,
} from "../assessment/schemas";
import { deleteCloudinaryImage, uploadFileToCloudinary } from "../cloudinary/assets";
import { CLOUDINARY_ASSESSMENT_FOLDER } from "../cloudinary/folders";
import type { Context } from "../context";
import { requireContextUser } from "../context";
import { HttpError } from "../http-error";
import { requireMemberOrganization } from "../member/member-access";
import type { PaginatedResponse } from "../pagination/offset";
import { createPaginatedResponse } from "../pagination/offset";

/**
 * Body-composition assessment handlers.
 *
 * Assessments belong to a *member*, not to a user, so every guard here is an
 * organization check: staff may only touch rows whose member sits in their
 * active organization, and a member may only read their own.
 */

const MEMBER_NOT_FOUND_MESSAGE = "Member not found";
const WRONG_MEMBER_ORG_MESSAGE =
	"Member does not belong to this organization";
const ASSESSMENT_NOT_FOUND_MESSAGE = "Assessment not found";
const WRONG_ASSESSMENT_ORG_MESSAGE =
	"Assessment does not belong to this organization";
const ACTIVE_ORG_REQUIRED_MESSAGE =
	"Forbidden: active organization required for this operation";
const WRITE_FORBIDDEN_MESSAGE =
	"Forbidden: direct admin, owner, or app admin role required";

interface OrganizationScope {
	organizationId: string;
	userId: string;
}

/** Every staff endpoint is scoped to the caller's resolved organization. */
function requireOrganizationScope(ctx: Context): OrganizationScope {
	const user = requireContextUser(ctx);
	const organizationId =
		ctx.organizationId ?? ctx.organization?.activeOrgId ?? null;
	if (!organizationId) {
		throw new HttpError(403, ACTIVE_ORG_REQUIRED_MESSAGE);
	}
	return { organizationId, userId: user.id };
}

/**
 * Write access re-asserted from the context: app admin, organization owner or
 * direct admin. The role flags are only present when an org-aware guard ran;
 * when they are absent the organization scope check above still applies.
 */
function requireAssessmentWriteScope(ctx: Context): OrganizationScope {
	const scope = requireOrganizationScope(ctx);
	const organization = ctx.organization;
	if (
		organization &&
		!(
			organization.isAppAdmin ||
			organization.isOwner ||
			organization.isDirectAdmin
		)
	) {
		throw new HttpError(403, WRITE_FORBIDDEN_MESSAGE);
	}
	return scope;
}

/**
 * Loads the row and its organization membership together, mapping the two
 * failure modes the clients distinguish: 403 when the row exists elsewhere,
 * 404 when it does not exist at all.
 */
async function requireAssessmentInOrganization(
	assessmentId: string,
	organizationId: string
): Promise<AssessmentRow> {
	const [belongs, existing] = await Promise.all([
		assessmentBelongsToOrganization(assessmentId, organizationId),
		findAssessmentById(assessmentId),
	]);

	if (!belongs) {
		throw existing
			? new HttpError(403, WRONG_ASSESSMENT_ORG_MESSAGE)
			: new HttpError(404, ASSESSMENT_NOT_FOUND_MESSAGE);
	}
	if (!existing) {
		throw new HttpError(404, ASSESSMENT_NOT_FOUND_MESSAGE);
	}
	return existing;
}

export interface CreateAssessmentHandlerInput extends CreateAssessmentInput {
	/** Multipart image buffer from `req.file`, when one was attached. */
	file?: Buffer;
}

export interface UpdateAssessmentHandlerInput extends UpdateAssessmentInput {
	/** Multipart image buffer from `req.file`, when one was attached. */
	file?: Buffer;
	id: string;
}

/**
 * Records an assessment for a member of the caller's organization.
 *
 * The organization check runs **before** the upload so a rejected request
 * never leaves an orphaned Cloudinary asset behind.
 */
export async function createBodyCompositionAssessment(
	ctx: Context,
	input: CreateAssessmentHandlerInput
): Promise<{ data: AssessmentDto }> {
	const { organizationId, userId } = requireAssessmentWriteScope(ctx);

	const memberOrganizationId = await findMemberOrganizationId(input.memberId);
	if (!memberOrganizationId) {
		throw new HttpError(404, MEMBER_NOT_FOUND_MESSAGE);
	}
	if (memberOrganizationId !== organizationId) {
		throw new HttpError(403, WRONG_MEMBER_ORG_MESSAGE);
	}

	const imagePublicId = input.file
		? await uploadFileToCloudinary(input.file, CLOUDINARY_ASSESSMENT_FOLDER)
		: null;

	const created = await insertAssessment({
		assessedAt: new Date(input.assessedAt),
		bmi: String(input.bmi),
		bodyFatPercent: String(input.bodyFatPercent),
		bodyWaterL: String(input.bodyWaterL),
		heightCm: String(input.heightCm),
		imagePublicId,
		memberId: input.memberId,
		muscleMassKg: String(input.muscleMassKg),
		// The recorder is always the caller — never taken from the request body.
		recordedById: userId,
		visceralFatAreaCm2: String(input.visceralFatAreaCm2),
		weightKg: String(input.weightKg),
	});

	if (!created) {
		throw new HttpError(500, "Failed to create assessment");
	}
	return { data: assessmentToDto(created) };
}

/** Offset-paginated list, scoped to the caller's organization. */
export async function listBodyCompositionAssessments(
	ctx: Context,
	input: ListAssessmentsInput
): Promise<PaginatedResponse<AssessmentDto>> {
	const { organizationId } = requireOrganizationScope(ctx);
	const { items, totalItems } = await listAssessmentsForOrganization(
		input,
		organizationId
	);
	return createPaginatedResponse(
		items.map(assessmentToDto),
		input.page,
		input.perPage,
		totalItems
	);
}

export async function getBodyCompositionAssessment(
	ctx: Context,
	input: AssessmentParams
): Promise<{ data: AssessmentDto }> {
	const { organizationId } = requireOrganizationScope(ctx);
	const existing = await requireAssessmentInOrganization(
		input.id,
		organizationId
	);
	return { data: assessmentToDto(existing) };
}

/**
 * Resolves the new `image_public_id`.
 *
 * `clearImage` wins over an attached file, and the previous asset is destroyed
 * before the replacement is stored so Cloudinary never accumulates orphans.
 * `undefined` means "leave the column alone".
 */
async function resolveImagePublicIdForUpdate(
	existingImagePublicId: string | null,
	input: UpdateAssessmentHandlerInput
): Promise<string | null | undefined> {
	if (input.clearImage) {
		await deleteCloudinaryImage(existingImagePublicId);
		return null;
	}
	if (input.file) {
		await deleteCloudinaryImage(existingImagePublicId);
		return await uploadFileToCloudinary(
			input.file,
			CLOUDINARY_ASSESSMENT_FOLDER
		);
	}
	return;
}

function buildUpdateValues(
	input: UpdateAssessmentHandlerInput,
	imagePublicId: string | null | undefined
): AssessmentUpdateValues {
	const values: AssessmentUpdateValues = {};
	if (input.assessedAt !== undefined) {
		values.assessedAt = new Date(input.assessedAt);
	}
	if (input.bmi !== undefined) {
		values.bmi = String(input.bmi);
	}
	if (input.bodyFatPercent !== undefined) {
		values.bodyFatPercent = String(input.bodyFatPercent);
	}
	if (input.bodyWaterL !== undefined) {
		values.bodyWaterL = String(input.bodyWaterL);
	}
	if (input.heightCm !== undefined) {
		values.heightCm = String(input.heightCm);
	}
	if (input.muscleMassKg !== undefined) {
		values.muscleMassKg = String(input.muscleMassKg);
	}
	if (input.visceralFatAreaCm2 !== undefined) {
		values.visceralFatAreaCm2 = String(input.visceralFatAreaCm2);
	}
	if (input.weightKg !== undefined) {
		values.weightKg = String(input.weightKg);
	}
	if (imagePublicId !== undefined) {
		values.imagePublicId = imagePublicId;
	}
	return values;
}

/** PATCH is a no-op unless something was actually sent. */
function hasAssessmentUpdate(input: UpdateAssessmentHandlerInput): boolean {
	return (
		input.assessedAt !== undefined ||
		input.bmi !== undefined ||
		input.bodyFatPercent !== undefined ||
		input.bodyWaterL !== undefined ||
		input.heightCm !== undefined ||
		input.muscleMassKg !== undefined ||
		input.visceralFatAreaCm2 !== undefined ||
		input.weightKg !== undefined ||
		input.clearImage ||
		input.file !== undefined
	);
}

export async function updateBodyCompositionAssessment(
	ctx: Context,
	input: UpdateAssessmentHandlerInput
): Promise<{ data: AssessmentDto }> {
	const { organizationId } = requireAssessmentWriteScope(ctx);
	if (!hasAssessmentUpdate(input)) {
		throw new HttpError(
			400,
			"At least one field, file, or clearImage must be provided for update"
		);
	}
	const existing = await requireAssessmentInOrganization(
		input.id,
		organizationId
	);

	const imagePublicId = await resolveImagePublicIdForUpdate(
		existing.imagePublicId,
		input
	);
	const updated = await updateAssessment(
		input.id,
		buildUpdateValues(input, imagePublicId)
	);

	if (!updated) {
		throw new HttpError(404, ASSESSMENT_NOT_FOUND_MESSAGE);
	}
	return { data: assessmentToDto(updated) };
}

/** Deletes the Cloudinary asset first, then the row. */
export async function deleteBodyCompositionAssessment(
	ctx: Context,
	input: AssessmentParams
): Promise<{ data: { deleted: true } }> {
	const { organizationId } = requireAssessmentWriteScope(ctx);
	const existing = await requireAssessmentInOrganization(
		input.id,
		organizationId
	);

	await deleteCloudinaryImage(existing.imagePublicId);
	await deleteAssessment(input.id);

	return { data: { deleted: true } };
}

/**
 * `GET /member/me/body-composition-assessments/recent`.
 *
 * With `orgId`, membership is re-proved and only that member's rows are
 * returned. Without it, the reader spans every membership the user has, and
 * each row carries the organization it belongs to.
 */
export async function listMemberRecentAssessments(
	ctx: Context,
	input: MemberRecentAssessmentsInput
): Promise<MemberRecentAssessmentsDto> {
	const user = requireContextUser(ctx);

	if (input.orgId) {
		const scope = await requireMemberOrganization(user.id, input.orgId);
		const { items } = await listAssessmentsForOrganization(
			{
				memberId: scope.memberId,
				page: 1,
				perPage: input.limit,
				sortBy: "assessedAt",
				sortOrder: "desc",
			},
			scope.organizationId
		);
		return {
			assessments: items.map((row) =>
				assessmentToMemberDto(row, scope.organization)
			),
			organization: scope.organization,
		};
	}

	const memberships = await listMembershipsWithOrganization(user.id);
	if (memberships.length === 0) {
		return { assessments: [], organization: null };
	}

	const organizationByMemberId = new Map(
		memberships.map((link) => [link.memberId, link.organization])
	);
	const rows = await listRecentAssessmentsForMembers(
		memberships.map((link) => link.memberId),
		input.limit
	);

	return {
		assessments: rows.map((row) =>
			assessmentToMemberDto(
				row,
				organizationByMemberId.get(row.memberId) ?? {
					id: "",
					name: "Unknown",
				}
			)
		),
		organization: null,
	};
}

/**
 * `GET /member/me/body-composition-assessments/:id`.
 *
 * Not found and not owned both answer 404, so the endpoint never reveals that
 * an assessment belonging to someone else exists.
 */
export async function getMemberAssessment(
	ctx: Context,
	input: MemberAssessmentInput
): Promise<{ data: MemberAssessmentDto }> {
	const user = requireContextUser(ctx);
	const scope = await requireMemberOrganization(user.id, input.orgId);

	const row = await findAssessmentForMember(input.id, scope.memberId);
	if (!row) {
		throw new HttpError(404, ASSESSMENT_NOT_FOUND_MESSAGE);
	}
	return { data: assessmentToMemberDto(row, scope.organization) };
}
