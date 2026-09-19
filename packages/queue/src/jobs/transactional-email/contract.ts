import { z } from 'zod'

export const TRANSACTIONAL_EMAIL_QUEUE = 'transactional-email'

export const VERIFICATION_EMAIL_JOB = 'verification-email'
export const PASSWORD_RESET_EMAIL_JOB = 'password-reset-email'
export const ORGANIZATION_INVITATION_JOB = 'organization-invitation'

export const verificationEmailPayloadSchema = z.object({
  to: z.email(),
  url: z.url(),
})

export const passwordResetEmailPayloadSchema = z.object({
  to: z.email(),
  url: z.url(),
})

export const organizationInvitationPayloadSchema = z.object({
  invitationRole: z.string().min(1),
  invitedByEmail: z.email(),
  invitedByUsername: z.string().min(1),
  inviteLink: z.url(),
  organizationName: z.string().min(1),
  to: z.email(),
})

export type VerificationEmailPayload = z.infer<typeof verificationEmailPayloadSchema>
export type PasswordResetEmailPayload = z.infer<typeof passwordResetEmailPayloadSchema>
export type OrganizationInvitationPayload = z.infer<typeof organizationInvitationPayloadSchema>
