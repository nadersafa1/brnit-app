import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	type CreateDietPlanAssignmentInput,
	createDietPlanAssignment,
	deleteDietPlanAssignment,
	type UpdateDietPlanAssignmentInput,
	updateDietPlanAssignment,
} from "@/lib/api/queries/organization-diet-plan-assignments";
import {
	type CreateDietPlanInput,
	createDietPlan,
} from "@/lib/api/queries/organization-diet-plans";
import {
	invalidateDietPlanAssignmentQueries,
	invalidateDietPlanQueries,
} from "@/lib/api/queries/organization-invalidation";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * Writes for the member's diet-plan assignments.
 *
 * The one rule worth naming here is **overlap**: a person may hold at most one
 * plan covering any given day, across *every* organization, and the server
 * answers 409 with a message saying so. That message is surfaced verbatim —
 * the client cannot see the other organization's assignments, so any local
 * pre-check would either be wrong or slowly drift from the server's.
 */

export function useCreateDietPlanAssignmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateDietPlanAssignmentInput) =>
			createDietPlanAssignment(input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not assign the diet plan")
			);
		},
		onSuccess: async () => {
			toast.success("Diet plan assigned");
			await invalidateDietPlanAssignmentQueries(queryClient);
		},
	});
}

export function useUpdateDietPlanAssignmentMutation(assignmentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateDietPlanAssignmentInput) =>
			updateDietPlanAssignment(assignmentId, input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the assignment")
			);
		},
		onSuccess: async () => {
			toast.success("Assignment updated");
			await invalidateDietPlanAssignmentQueries(queryClient);
		},
	});
}

export function useDeleteDietPlanAssignmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (assignmentId: string) =>
			deleteDietPlanAssignment(assignmentId),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not remove the assignment")
			);
		},
		onSuccess: async () => {
			// Deleting an assignment cascades its consumptions and meal-time rows.
			toast.success("Assignment removed");
			await invalidateDietPlanAssignmentQueries(queryClient);
		},
	});
}

export function useCreateDietPlanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateDietPlanInput) => createDietPlan(input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the diet plan")
			);
		},
		onSuccess: async () => {
			toast.success("Diet plan created");
			await invalidateDietPlanQueries(queryClient);
		},
	});
}
