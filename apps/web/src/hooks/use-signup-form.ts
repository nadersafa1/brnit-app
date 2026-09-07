import { getTodayUtcDateString } from "@brnit/datetime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
	getAuthClientErrorMessage,
	useAuthFormServerError,
} from "@/hooks/use-auth-form-server-error";
import { authClient } from "@/lib/auth-client";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";

const MIN_PASSWORD_LENGTH = 8;
const ACCEPT_INVITATION_PATH = "/accept-invitation";

const signupSchema = z
	.object({
		confirmPassword: z.string(),
		dob: z
			.string()
			.min(1, "Date of birth is required")
			.refine(
				(value) => value <= getTodayUtcDateString(),
				"Date of birth cannot be in the future"
			),
		email: z.email("Enter a valid email address"),
		name: z.string().trim().min(1, "Name is required"),
		password: z
			.string()
			.min(
				MIN_PASSWORD_LENGTH,
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
			),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Sign-up collects `dob` up front, which is why an email/password account never
 * hits `/complete-profile` — only OAuth accounts do, since no provider returns
 * a date of birth.
 */
export function useSignupForm() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/signup" });
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();
	const [isVerificationSent, setVerificationSent] = useState(false);

	const target = search.invitationId
		? `${ACCEPT_INVITATION_PATH}?invitationId=${encodeURIComponent(search.invitationId)}`
		: resolvePostAuthPath(search.redirect);

	const form = useForm<SignupFormValues>({
		defaultValues: {
			confirmPassword: "",
			dob: "",
			email: "",
			name: "",
			password: "",
		},
		mode: "onBlur",
		resolver: zodResolver(signupSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		await authClient.signUp.email(
			{
				callbackURL: `${window.location.origin}${target}`,
				dob: new Date(values.dob),
				email: values.email,
				name: values.name,
				password: values.password,
			},
			{
				onError: (context) => {
					reportServerError(
						getAuthClientErrorMessage(context) ?? "Sign up failed"
					);
				},
				onSuccess: () => {
					// `requireEmailVerification` is on, so there is no session yet —
					// showing the dashboard would bounce straight back to `/login`.
					setVerificationSent(true);
					toast.success("Account created. Check your email to verify it.");
				},
			}
		);
	});

	return {
		form,
		goToLogin: () => navigate({ search: {}, to: "/login" }),
		isVerificationSent,
		onSubmit,
		serverError,
	};
}
