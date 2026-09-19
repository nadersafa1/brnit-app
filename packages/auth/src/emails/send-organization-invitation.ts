import { enqueueOrganizationInvitation } from '@burn-app/queue'

/** Adapts better-auth's organization hook to the transactional email queue. */
export async function sendOrganizationInvitation({
  email,
  invitedByUsername,
  invitedByEmail,
  organizationName,
  inviteLink,
  invitationRole,
}: {
  email: string
  invitedByUsername: string
  invitedByEmail: string
  organizationName: string
  inviteLink: string
  invitationRole: string
}) {
  await enqueueOrganizationInvitation({
    invitationRole,
    invitedByEmail,
    invitedByUsername,
    inviteLink,
    organizationName,
    to: email,
  })
}
