import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { Link } from "@tanstack/react-router";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import Loader from "@/components/loader";
import { AppleIcon, GoogleIcon } from "@/components/social-icons";
import { useLoginForm } from "@/hooks/use-login-form";

export function LoginPage() {
	const {
		activeSocialProvider,
		form,
		invitationId,
		isResendingVerification,
		isSessionPending,
		needsEmailVerification,
		onSubmit,
		resendVerificationEmail,
		serverError,
		signInWithProvider,
	} = useLoginForm();

	if (isSessionPending) {
		return <Loader />;
	}

	const isSocialBusy = activeSocialProvider !== null;

	return (
		<AuthPageShell
			description="Sign in to keep going with your challenge."
			title="Welcome back"
		>
			<form className="mt-8 space-y-4" onSubmit={onSubmit}>
				{serverError ? <AuthFormError message={serverError} /> : null}

				<FormField
					error={form.formState.errors.email}
					htmlFor="login-email"
					label="Email"
				>
					<Input
						{...form.register("email")}
						autoComplete="email"
						id="login-email"
						placeholder="you@example.com"
						type="email"
					/>
				</FormField>

				<FormField
					error={form.formState.errors.password}
					htmlFor="login-password"
					label="Password"
				>
					<Input
						{...form.register("password")}
						autoComplete="current-password"
						id="login-password"
						type="password"
					/>
				</FormField>

				<div className="-mt-1 flex justify-end">
					<Link
						className="text-accent-fg text-xs underline-offset-4 hover:underline"
						to="/forgot-password"
					>
						Forgot password?
					</Link>
				</div>

				<SubmitButton
					className="w-full"
					disabled={isSocialBusy}
					idleLabel="Sign in"
					isSubmitting={form.formState.isSubmitting}
					pendingLabel="Signing in…"
				/>

				{needsEmailVerification ? (
					<div
						className="space-y-3 rounded-xl bg-accent-soft px-3 py-3 text-sm"
						role="alert"
					>
						<p>
							Verify your email address before signing in. Check your inbox for
							the link.
						</p>
						<Button
							disabled={isResendingVerification}
							onClick={resendVerificationEmail}
							size="sm"
							type="button"
							variant="outline"
						>
							{isResendingVerification
								? "Sending…"
								: "Resend verification email"}
						</Button>
					</div>
				) : null}

				<div className="flex items-center gap-3 pt-1">
					<span aria-hidden className="h-px flex-1 bg-border" />
					<span className="text-muted-foreground text-xs">or</span>
					<span aria-hidden className="h-px flex-1 bg-border" />
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<Button
						disabled={isSocialBusy}
						onClick={() => signInWithProvider("google")}
						type="button"
						variant="outline"
					>
						<GoogleIcon />
						Google
					</Button>
					<Button
						disabled={isSocialBusy}
						onClick={() => signInWithProvider("apple")}
						type="button"
						variant="outline"
					>
						<AppleIcon />
						Apple
					</Button>
				</div>
			</form>

			<p className="mt-6 text-center text-muted-foreground text-sm">
				Don't have an account?{" "}
				<Link
					className="text-accent-fg underline-offset-4 hover:underline"
					search={invitationId ? { invitationId } : {}}
					to="/signup"
				>
					Sign up
				</Link>
			</p>
		</AuthPageShell>
	);
}
