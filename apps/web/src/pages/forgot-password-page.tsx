import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
	email: z.email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
	const [isSent, setSent] = useState(false);
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<ForgotPasswordValues>({
		defaultValues: { email: "" },
		mode: "onBlur",
		resolver: zodResolver(forgotPasswordSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		const { error } = await authClient.requestPasswordReset({
			email: values.email,
			// Path only: better-auth appends the token and resolves it against the
			// web app origin it was configured with.
			redirectTo: "/reset-password",
		});
		if (error) {
			reportServerError(error.message ?? "Could not send the reset link");
			return;
		}
		// Always the same confirmation, whether or not the address exists — the
		// screen must not become an account-enumeration oracle.
		setSent(true);
	});

	if (isSent) {
		return (
			<AuthPageShell
				description="If an account exists for that address, we've sent a link to reset the password."
				title="Check your email"
			>
				<div className="mt-8 flex flex-col items-center gap-4">
					<MailCheckIcon aria-hidden className="size-8 text-accent-fg" />
					<Link
						className="text-accent-fg text-sm underline-offset-4 hover:underline"
						search={{}}
						to="/login"
					>
						Back to sign in
					</Link>
				</div>
			</AuthPageShell>
		);
	}

	return (
		<AuthPageShell
			description="We'll email you a link to set a new one."
			title="Forgot your password?"
		>
			<form className="mt-8 space-y-4" onSubmit={onSubmit}>
				{serverError ? <AuthFormError message={serverError} /> : null}
				<FormField
					error={form.formState.errors.email}
					htmlFor="forgot-password-email"
					label="Email"
				>
					<Input
						{...form.register("email")}
						autoComplete="email"
						id="forgot-password-email"
						type="email"
					/>
				</FormField>
				<SubmitButton
					className="w-full"
					idleLabel="Send reset link"
					isSubmitting={form.formState.isSubmitting}
					pendingLabel="Sending…"
				/>
			</form>
			<p className="mt-6 text-center text-muted-foreground text-sm">
				<Link
					className="text-accent-fg underline-offset-4 hover:underline"
					search={{}}
					to="/login"
				>
					Back to sign in
				</Link>
			</p>
		</AuthPageShell>
	);
}
