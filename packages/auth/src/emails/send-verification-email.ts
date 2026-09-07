import type { User } from "better-auth";

import { sendEmail } from "../send-email";

/** `emailVerification.sendVerificationEmail`. Link expires after 24 hours. */
export async function sendVerificationEmail({
	user,
	url,
}: {
	user: User;
	url: string;
}): Promise<void> {
	await sendEmail({
		meta: {
			description: "Click the link below to verify your email address",
			link: url,
			linkText: "Verify Email",
		},
		subject: "Email Verification",
		to: user.email,
	});
}
