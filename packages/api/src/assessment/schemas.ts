import { z } from "zod";

import {
	pageSchema,
	perPageSchema,
	sortOrderSchema,
} from "../pagination/query-params";

/**
 * Input schemas for body-composition assessments.
 *
 * Every write is `multipart/form-data` (the image rides along with the
 * metrics), so each numeric field arrives as a string and has to be coerced
 * before its range is checked.
 */

const MAX_ID_LENGTH = 64;
const MAX_METRIC = 999.99;
const MAX_BODY_FAT_PERCENT = 100;
const MAX_BMI = 99.99;
const MAX_VISCERAL_FAT_AREA = 9999.99;
const DEFAULT_RECENT_LIMIT = 5;
const MIN_RECENT_LIMIT = 1;
const MAX_RECENT_LIMIT = 20;

/** better-auth ids are nanoid-like, not UUIDs — do not tighten this to `.uuid()`. */
const idSchema = z.string().min(1).max(MAX_ID_LENGTH);

const metricSchema = z.number().min(0).max(MAX_METRIC);
const bodyFatPercentSchema = z.number().min(0).max(MAX_BODY_FAT_PERCENT);
const bmiSchema = z.number().min(0).max(MAX_BMI);
const visceralFatAreaSchema = z.number().min(0).max(MAX_VISCERAL_FAT_AREA);

const assessedAtSchema = z
	.string()
	.min(1)
	.transform((value) => value.trim())
	.pipe(z.iso.datetime());

/** `clearImage` is sent as `'1'` or `'true'`; anything else means "leave it". */
const clearImageSchema = z
	.string()
	.optional()
	.transform((value) => value === "1" || value === "true");

/**
 * A blank multipart field means "not sent".
 *
 * Without this, `z.coerce.number()` would read `""` as `0` and a PATCH that
 * merely touched the form would silently zero the metric.
 */
function blankToUndefined(value: unknown): unknown {
	return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const createAssessmentInputSchema = z.object({
	assessedAt: assessedAtSchema,
	bmi: z.coerce.number().pipe(bmiSchema),
	bodyFatPercent: z.coerce.number().pipe(bodyFatPercentSchema),
	bodyWaterL: z.coerce.number().pipe(metricSchema),
	heightCm: z.coerce.number().pipe(metricSchema),
	memberId: idSchema,
	muscleMassKg: z.coerce.number().pipe(metricSchema),
	visceralFatAreaCm2: z.coerce.number().pipe(visceralFatAreaSchema),
	weightKg: z.coerce.number().pipe(metricSchema),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentInputSchema>;

/**
 * Every metric is optional on PATCH. "At least one of field / file /
 * clearImage" is enforced in the controller, which is the only layer that can
 * see whether a file was actually attached.
 */
export const updateAssessmentInputSchema = z.object({
	assessedAt: z.preprocess(blankToUndefined, assessedAtSchema.optional()),
	bmi: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(bmiSchema).optional()
	),
	bodyFatPercent: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(bodyFatPercentSchema).optional()
	),
	bodyWaterL: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(metricSchema).optional()
	),
	clearImage: clearImageSchema,
	heightCm: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(metricSchema).optional()
	),
	muscleMassKg: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(metricSchema).optional()
	),
	visceralFatAreaCm2: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(visceralFatAreaSchema).optional()
	),
	weightKg: z.preprocess(
		blankToUndefined,
		z.coerce.number().pipe(metricSchema).optional()
	),
});

export type UpdateAssessmentInput = z.infer<typeof updateAssessmentInputSchema>;

export const assessmentParamsSchema = z.object({
	id: idSchema,
});

export type AssessmentParams = z.infer<typeof assessmentParamsSchema>;

/** Offset-paginated staff listing, scoped to the caller's active organization. */
export const listAssessmentsInputSchema = z.object({
	memberId: idSchema.optional(),
	page: pageSchema,
	perPage: perPageSchema,
	sortBy: z.enum(["assessedAt", "createdAt"]).optional(),
	sortOrder: sortOrderSchema,
});

export type ListAssessmentsInput = z.infer<typeof listAssessmentsInputSchema>;

/**
 * Member-facing recent list. Without `orgId` the reader spans every
 * organization the user is a member of; with it, that organization only.
 */
export const memberRecentAssessmentsInputSchema = z.object({
	limit: z
		.string()
		.optional()
		.transform((value) =>
			value ? Number.parseInt(value, 10) : DEFAULT_RECENT_LIMIT
		)
		.pipe(z.number().min(MIN_RECENT_LIMIT).max(MAX_RECENT_LIMIT)),
	orgId: idSchema.optional(),
});

export type MemberRecentAssessmentsInput = z.infer<
	typeof memberRecentAssessmentsInputSchema
>;

/** `orgId` is required here: it is what resolves the member whose row this is. */
export const memberAssessmentInputSchema = z.object({
	id: idSchema,
	orgId: z.string().min(1, "orgId is required").max(MAX_ID_LENGTH),
});

export type MemberAssessmentInput = z.infer<typeof memberAssessmentInputSchema>;
