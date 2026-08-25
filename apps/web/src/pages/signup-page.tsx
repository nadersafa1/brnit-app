import { getTodayUtcDateString } from "@brnit/datetime";
import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { Link } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useSignupForm } from "@/hooks/use-signup-form";

export function SignupPage() {
	const { form, goToLogin, isVerificationSent, onSubmit, serverError } =
		useSignupForm();
	const { errors } = form.formState;

	if (isVerificationSent) {
		return (
			<AuthPageShell
				description="We sent you a verification link. Open it to finish setting up your account."
				title="Check your email"
			>
				<div className="mt-8 flex flex-col items-center gap-4">
					<MailCheckIcon aria-hidden className="size-8 text-accent-fg" />
					<Button onClick={goToLogin} variant="outline">
						Back to sign in
					</Button>
				</div>
			</AuthPageShell>
		);
	}

	return (
		<AuthPageShell
			description="Join your organization and start your challenge."
			title="Create your account"
		>
			<form className="mt-8 space-y-4" onSubmit={onSubmit}>
				{serverError ? <AuthFormError message={serverError} /> : null}

				<FormField error={errors.name} htmlFor="signup-name" label="Name">
					<Input
						{...form.register("name")}
						autoComplete="name"
						id="signup-name"
					/>
				</FormField>

				<FormField error={errors.email} htmlFor="signup-email" label="Email">
					<Input
						{...form.register("email")}
						autoComplete="email"
						id="signup-email"
						type="email"
					/>
				</FormField>

				<FormField
					error={errors.dob}
					htmlFor="signup-dob"
					label="Date of birth"
				>
					<Input
						{...form.register("dob")}
						autoComplete="bday"
						id="signup-dob"
						max={getTodayUtcDateString()}
						type="date"
					/>
				</FormField>

				<FormField
					error={errors.password}
					htmlFor="signup-password"
					label="Password"
				>
					<Input
						{...form.register("password")}
						autoComplete="new-password"
						id="signup-password"
						type="password"
					/>
				</FormField>

				<FormField
					error={errors.confirmPassword}
					htmlFor="signup-confirm-password"
					label="Confirm password"
				>
					<Input
						{...form.register("confirmPassword")}
						autoComplete="new-password"
						id="signup-confirm-password"
						type="password"
					/>
				</FormField>

				<SubmitButton
					className="w-full"
					idleLabel="Create account"
					isSubmitting={form.formState.isSubmitting}
					pendingLabel="Creating…"
				/>
			</form>

			<p className="mt-6 text-center text-muted-foreground text-sm">
				Already have an account?{" "}
				<Link
					className="text-accent-fg underline-offset-4 hover:underline"
					search={{}}
					to="/login"
				>
					Sign in
				</Link>
			</p>
		</AuthPageShell>
	);
}
