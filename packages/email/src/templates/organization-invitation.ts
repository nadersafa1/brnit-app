import { sendEmail } from '../send-email'

export async function sendOrganizationInvitation({
  to,
  invitedByUsername,
  invitedByEmail,
  organizationName,
  inviteLink,
  invitationRole,
}: {
  to: string
  invitedByUsername: string
  invitedByEmail: string
  organizationName: string
  inviteLink: string
  invitationRole: string
}) {
  await sendEmail({
    to,
    subject: `You're invited to join ${organizationName}`,
    meta: {
      description: `${invitedByUsername} (${invitedByEmail}) has invited you to join ${organizationName} on Brnit as ${invitationRole}. Accept to join the group and start your health challenge.`,
      link: inviteLink,
      linkText: 'Accept invitation',
    },
  })
}
