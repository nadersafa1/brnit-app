import { sendEmail } from "../send-email";

export interface OrganizationInvitationEmailParams {
	email: string;
	invitationRole: string;
	invitedByEmail: string;
	invitedByUsername: string;
	inviteLink: string;
	organizationName: string;
}

/** Invitation email. The link is built by the caller; invitations expire in 7 days. */
export async function sendOrganizationInvitation({
	email,
	invitedByUsername,
	invitedByEmail,
	organizationName,
	inviteLink,
	invitationRole,
}: OrganizationInvitationEmailParams): Promise<void> {
	await sendEmail({
		meta: {
			description: `${invitedByUsername} (${invitedByEmail}) has invited you to join ${organizationName} on Brnit as ${invitationRole}. Accept to join the group and start your health challenge.`,
			link: inviteLink,
			linkText: "Accept invitation",
		},
		subject: `You're invited to join ${organizationName}`,
		to: email,
	});
}
