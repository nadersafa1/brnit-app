import type { User } from "better-auth";

import { sendEmail } from "../send-email";

/**
 * `emailAndPassword.sendResetPassword`. `url` is built by Better Auth from the
 * caller's `redirectTo` — `/reset-password` on web, `brnit://reset-password`
 * on native — so this module never needs to know the target origin.
 */
export async function sendPasswordResetEmail({
	user,
	url,
}: {
	user: User;
	url: string;
}): Promise<void> {
	await sendEmail({
		meta: {
			description: "Click the link below to reset your password",
			link: url,
			linkText: "Reset Password",
		},
		subject: "Password Reset",
		to: user.email,
	});
}
