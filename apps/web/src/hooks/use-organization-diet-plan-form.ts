import { createDietPlanInputSchema } from "@brnit/api/diet-plan/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { useCreateDietPlanMutation } from "@/hooks/use-organization-assignment-mutations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * The server's own create schema, minus the slots.
 *
 * `dietPlanMeals` defaults to `[]`, so a plan created here starts empty and its
 * meals are added in the plan editor — this form exists to get a plan into
 * existence from the member you are about to assign it to.
 */
const dietPlanFormSchema = createDietPlanInputSchema.omit({
	dietPlanMeals: true,
});

export type DietPlanFormInput = z.input<typeof dietPlanFormSchema>;
export type DietPlanFormOutput = z.output<typeof dietPlanFormSchema>;

interface UseOrganizationDietPlanFormOptions {
	/** Handed the new plan's id so the caller can assign it straight away. */
	onCreated: (dietPlanId: string) => void;
}

export function useOrganizationDietPlanForm({
	onCreated,
}: UseOrganizationDietPlanFormOptions) {
	const createMutation = useCreateDietPlanMutation();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<DietPlanFormInput, unknown, DietPlanFormOutput>({
		defaultValues: { description: "", name: "" },
		mode: "onBlur",
		resolver: zodResolver(dietPlanFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		try {
			const plan = await createMutation.mutateAsync({
				// An empty description is "none", not an empty string.
				description: values.description?.trim() || undefined,
				name: values.name,
			});
			form.reset({ description: "", name: "" });
			onCreated(plan.id);
		} catch (error) {
			reportServerError(
				getUserFacingErrorMessage(error, "Could not create the diet plan")
			);
		}
	});

	return {
		form,
		isSaving: createMutation.isPending,
		onSubmit,
		serverError,
	};
}
