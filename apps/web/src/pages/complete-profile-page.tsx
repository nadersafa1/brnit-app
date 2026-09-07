import { getTodayUtcDateString } from "@brnit/datetime";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { updateProfile } from "@/lib/api/queries/profile";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";

/** Mirrors the server's `dobSchema`: a real calendar date, today or earlier. */
const completeProfileSchema = z.object({
	dob: z
		.string()
		.min(1, "Date of birth is required")
		.refine(
			(value) => value <= getTodayUtcDateString(),
			"Date of birth cannot be in the future"
		),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

/**
 * The one field sign-up cannot collect. `/dashboard` redirects here until it is
 * set, because every diet-plan screen assumes an age.
 */
export function CompleteProfilePage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/complete-profile" });
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<CompleteProfileValues>({
		defaultValues: { dob: "" },
		mode: "onBlur",
		resolver: zodResolver(completeProfileSchema),
	});

	const mutation = useMutation({
		mutationFn: (values: CompleteProfileValues) =>
			updateProfile({ dob: values.dob }),
		onError: (error) => {
			reportServerError(
				getUserFacingErrorMessage(error, "Could not save your date of birth")
			);
		},
		onSuccess: () => {
			toast.success("Profile completed");
			navigate({ href: resolvePostAuthPath(search.redirect) });
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		await mutation.mutateAsync(values).catch(() => {
			// Reported through `onError`; swallowed so the form settles.
		});
	});

	return (
		<AuthPageShell
			description="We need your date of birth before you can start a plan."
			title="Complete your profile"
		>
			<form className="mt-8 space-y-4" onSubmit={onSubmit}>
				{serverError ? <AuthFormError message={serverError} /> : null}
				<FormField
					error={form.formState.errors.dob}
					htmlFor="complete-profile-dob"
					label="Date of birth"
				>
					<Input
						{...form.register("dob")}
						autoComplete="bday"
						id="complete-profile-dob"
						max={getTodayUtcDateString()}
						type="date"
					/>
				</FormField>
				<SubmitButton
					className="w-full"
					idleLabel="Continue"
					isSubmitting={form.formState.isSubmitting}
					pendingLabel="Saving…"
				/>
			</form>
		</AuthPageShell>
	);
}
