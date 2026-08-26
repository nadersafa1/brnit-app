import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;
const INVALID_TOKEN_CODE = "INVALID_TOKEN";

const resetPasswordSchema = z
	.object({
		confirmPassword: z.string(),
		newPassword: z
			.string()
			.min(
				MIN_PASSWORD_LENGTH,
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
			),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
	const navigate = useNavigate();
	const { token } = useSearch({ from: "/reset-password" });
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<ResetPasswordValues>({
		defaultValues: { confirmPassword: "", newPassword: "" },
		mode: "onBlur",
		resolver: zodResolver(resetPasswordSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		if (!token) {
			reportServerError("This reset link is invalid or has expired");
			return;
		}
		clearServerError();
		const { error } = await authClient.resetPassword({
			newPassword: values.newPassword,
			token,
		});
		if (error) {
			reportServerError(
				error.code === INVALID_TOKEN_CODE
					? "This reset link is invalid or has expired"
					: (error.message ?? "Could not reset the password")
			);
			return;
		}
		toast.success("Password updated. Sign in with your new password.");
		navigate({ search: {}, to: "/login" });
	});

	if (!token) {
		return (
			<AuthPageShell
				description="Ask for a new link and try again."
				title="This reset link is invalid"
			>
				<div className="mt-8 flex justify-center">
					<Link
						className="text-accent-fg text-sm underline-offset-4 hover:underline"
						to="/forgot-password"
					>
						Request a new reset link
					</Link>
				</div>
			</AuthPageShell>
		);
	}

	return (
		<AuthPageShell
			description="Choose a new password for your account."
			title="Set a new password"
		>
			<form className="mt-8 space-y-4" onSubmit={onSubmit}>
				{serverError ? <AuthFormError message={serverError} /> : null}
				<FormField
					error={form.formState.errors.newPassword}
					htmlFor="reset-password-new"
					label="New password"
				>
					<Input
						{...form.register("newPassword")}
						autoComplete="new-password"
						id="reset-password-new"
						type="password"
					/>
				</FormField>
				<FormField
					error={form.formState.errors.confirmPassword}
					htmlFor="reset-password-confirm"
					label="Confirm password"
				>
					<Input
						{...form.register("confirmPassword")}
						autoComplete="new-password"
						id="reset-password-confirm"
						type="password"
					/>
				</FormField>
				<SubmitButton
					className="w-full"
					idleLabel="Update password"
					isSubmitting={form.formState.isSubmitting}
					pendingLabel="Updating…"
				/>
			</form>
		</AuthPageShell>
	);
}
