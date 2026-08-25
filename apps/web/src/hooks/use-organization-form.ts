import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { useCreateOrganizationMutation } from "@/hooks/use-organization-mutations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const NON_SLUG_CHARACTERS = /[^a-z0-9-]/g;
const WHITESPACE_RUNS = /\s+/g;
const HYPHEN_RUNS = /-+/g;
const LEADING_OR_TRAILING_HYPHEN = /^-|-$/g;

/** `"Acme Health Co."` -> `"acme-health-co"`. */
function nameToSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(WHITESPACE_RUNS, "-")
		.replace(NON_SLUG_CHARACTERS, "")
		.replace(HYPHEN_RUNS, "-")
		.replace(LEADING_OR_TRAILING_HYPHEN, "");
}

const createOrganizationSchema = z.object({
	name: z.string().min(1, "Name is required"),
	slug: z
		.string()
		.min(1, "Slug is required")
		.regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only"),
});

export type CreateOrganizationFormValues = z.infer<
	typeof createOrganizationSchema
>;

interface UseOrganizationFormOptions {
	onCreated?: () => void;
}

/**
 * The create-organization form.
 *
 * The slug is derived from the name as it is typed rather than being a separate
 * thing to invent, but it stays editable — better-auth rejects a duplicate, and
 * the only fix is to change it by hand.
 *
 * A duplicate slug is a **server** error with no field to sit under from
 * react-hook-form's point of view, so it goes to the banner; the format rule is
 * a field error. Keeping the two channels apart is what stops "slug is taken"
 * from being mistaken for "slug is malformed".
 */
export function useOrganizationForm({
	onCreated,
}: UseOrganizationFormOptions = {}) {
	const navigate = useNavigate();
	const createMutation = useCreateOrganizationMutation();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<CreateOrganizationFormValues>({
		defaultValues: { name: "", slug: "" },
		mode: "onBlur",
		resolver: zodResolver(createOrganizationSchema),
	});

	const nameField = form.register("name");

	const onNameChange = async (
		event: ChangeEvent<HTMLInputElement>
	): Promise<void> => {
		await nameField.onChange(event);
		form.setValue("slug", nameToSlug(event.target.value), {
			shouldValidate: form.formState.isSubmitted,
		});
	};

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		try {
			const organization = await createMutation.mutateAsync(values);
			form.reset({ name: "", slug: "" });
			onCreated?.();
			navigate({
				params: { organizationId: organization.id },
				to: "/dashboard/organizations/$organizationId",
			});
		} catch (error) {
			reportServerError(
				getUserFacingErrorMessage(error, "Could not create the organization")
			);
		}
	});

	return {
		form,
		isSaving: createMutation.isPending,
		nameField,
		onNameChange,
		onSubmit,
		serverError,
	};
}
