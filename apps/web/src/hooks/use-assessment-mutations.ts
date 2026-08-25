import type { AssessmentDto } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiRequestError } from "@/lib/api/api-request-error";
import { invalidateAssessmentQueries } from "@/lib/api/invalidate-assessment-queries";
import {
	type AssessmentImageOptions,
	type CreateAssessmentFields,
	createAssessment,
	deleteAssessment,
	type UpdateAssessmentFields,
	updateAssessment,
} from "@/lib/api/queries/assessments";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * Writes for body-composition assessments.
 *
 * `mutationFn` → `onSuccess`: toast, then `await` the **named** invalidation
 * helper. The invalidation is awaited so `isPending` stays true until the lists
 * have actually refreshed — otherwise a dialog closes onto stale rows.
 *
 * Create and update deliberately do **not** toast on failure: both are only
 * reached from a form, and the form renders the reason in its server-error
 * banner where it stays put next to the fields that produced it. Delete has no
 * form, so it keeps the toast.
 */

const WRONG_ORGANIZATION_STATUS = 403;

/**
 * A 403 from these endpoints has exactly one cause: the member (or the
 * assessment's member) sits in a different organization from the active one.
 * The server's sentence is accurate but does not say what to do about it, so it
 * gets a written message rather than a generic failure line.
 */
const WRONG_ORGANIZATION_MESSAGE =
	"This member belongs to a different organization. Switch to that organization to record or edit their assessments.";

export function getAssessmentWriteErrorMessage(
	error: unknown,
	fallback: string
): string {
	if (isApiRequestError(error) && error.status === WRONG_ORGANIZATION_STATUS) {
		return WRONG_ORGANIZATION_MESSAGE;
	}
	return getUserFacingErrorMessage(error, fallback);
}

export interface CreateAssessmentPayload {
	fields: CreateAssessmentFields;
	image?: AssessmentImageOptions;
}

export interface UpdateAssessmentPayload {
	fields: UpdateAssessmentFields;
	image?: AssessmentImageOptions;
}

export function useCreateAssessmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateAssessmentPayload) =>
			createAssessment(payload.fields, payload.image),
		onSuccess: async () => {
			toast.success("Assessment added");
			await invalidateAssessmentQueries(queryClient);
		},
	});
}

export function useUpdateAssessmentMutation(assessmentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateAssessmentPayload) =>
			updateAssessment(assessmentId, payload.fields, payload.image),
		onSuccess: async (_assessment: AssessmentDto) => {
			toast.success("Assessment updated");
			await invalidateAssessmentQueries(queryClient);
		},
	});
}

/**
 * The server destroys the Cloudinary asset before the row, so a partial failure
 * leaves the row intact. Nothing is removed from the cache up front — the list
 * is re-read and shows whatever actually survived.
 *
 * The id is a mutation **variable** rather than a hook argument: the caller is a
 * table where the row being deleted is chosen after the hook has run.
 */
export function useDeleteAssessmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (assessmentId: string) => deleteAssessment(assessmentId),
		onError: (error) => {
			toast.error(
				getAssessmentWriteErrorMessage(error, "Could not delete the assessment")
			);
		},
		onSuccess: async () => {
			toast.success("Assessment deleted");
			await invalidateAssessmentQueries(queryClient);
		},
	});
}
