import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
	getAuthClientErrorMessage,
	getAuthClientErrorStatus,
	useAuthFormServerError,
} from "@/hooks/use-auth-form-server-error";
import { authClient } from "@/lib/auth-client";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_NOT_VERIFIED_STATUS = 403;
const ACCEPT_INVITATION_PATH = "/accept-invitation";

const loginSchema = z.object({
	email: z.email("Enter a valid email address"),
	password: z
		.string()
		.min(
			MIN_PASSWORD_LENGTH,
			`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
		),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

type SocialProvider = "apple" | "google";

/**
 * An invitation link routes through sign-in, so the invitation has to survive
 * the round trip: unless an explicit `redirect` points somewhere else, an
 * `invitationId` wins and sends the user straight to accepting it.
 */
function resolveLoginTarget(search: {
	invitationId?: string;
	redirect?: string;
}): string {
	const redirectPath = resolvePostAuthPath(search.redirect);
	if (
		search.invitationId &&
		(search.redirect === undefined ||
			redirectPath.startsWith(ACCEPT_INVITATION_PATH))
	) {
		return `${ACCEPT_INVITATION_PATH}?invitationId=${encodeURIComponent(search.invitationId)}`;
	}
	return redirectPath;
}

/**
 * Owns the login schema, the form, the sign-in calls and the two error
 * channels. The page component is layout only — that split is what keeps a
 * screen readable once OAuth and the resend-verification branch are in it.
 */
export function useLoginForm() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/login" });
	const { isPending: isSessionPending } = authClient.useSession();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();
	const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
	const [isResendingVerification, setIsResendingVerification] = useState(false);
	const [activeSocialProvider, setActiveSocialProvider] =
		useState<SocialProvider | null>(null);

	const target = resolveLoginTarget(search);

	const form = useForm<LoginFormValues>({
		defaultValues: { email: "", password: "" },
		mode: "onBlur",
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		setNeedsEmailVerification(false);
		await authClient.signIn.email(
			{ email: values.email, password: values.password },
			{
				onError: (context) => {
					// 403 is specifically "email not verified" — it gets its own
					// recovery affordance rather than a dead-end error line.
					if (getAuthClientErrorStatus(context) === EMAIL_NOT_VERIFIED_STATUS) {
						setNeedsEmailVerification(true);
						return;
					}
					reportServerError(
						getAuthClientErrorMessage(context) ?? "Sign in failed"
					);
				},
				onSuccess: () => {
					toast.success("Signed in");
					navigate({ href: target });
				},
			}
		);
	});

	const resendVerificationEmail = useCallback(async () => {
		const email = form.getValues("email");
		if (!email) {
			reportServerError("Enter your email address first");
			return;
		}
		setIsResendingVerification(true);
		const { error } = await authClient.sendVerificationEmail({
			callbackURL: `${window.location.origin}${target}`,
			email,
		});
		setIsResendingVerification(false);
		if (error) {
			reportServerError(
				error.message ?? "Could not send the verification email"
			);
			return;
		}
		toast.success("Verification email sent. Check your inbox.");
		setNeedsEmailVerification(false);
	}, [form, reportServerError, target]);

	const signInWithProvider = useCallback(
		async (provider: SocialProvider) => {
			clearServerError();
			setActiveSocialProvider(provider);
			// Absolute URL: the API and the SPA are different origins, so the OAuth
			// callback has to name where to come back to. The SPA origin is in the
			// server's `trustedOrigins`.
			const { error } = await authClient.signIn.social({
				callbackURL: `${window.location.origin}${target}`,
				provider,
			});
			if (error) {
				setActiveSocialProvider(null);
				reportServerError(error.message ?? `${provider} sign-in failed`);
			}
		},
		[clearServerError, reportServerError, target]
	);

	return {
		activeSocialProvider,
		form,
		invitationId: search.invitationId,
		isResendingVerification,
		isSessionPending,
		needsEmailVerification,
		onSubmit,
		resendVerificationEmail,
		serverError,
		signInWithProvider,
	};
}
