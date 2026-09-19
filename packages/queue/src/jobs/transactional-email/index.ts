import { sendOrganizationInvitation, sendPasswordResetEmail, sendVerificationEmail } from '@burn-app/email'
import { defineJob } from '../../lib/define-job'
import {
  ORGANIZATION_INVITATION_JOB,
  organizationInvitationPayloadSchema,
  PASSWORD_RESET_EMAIL_JOB,
  passwordResetEmailPayloadSchema,
  TRANSACTIONAL_EMAIL_QUEUE,
  VERIFICATION_EMAIL_JOB,
  verificationEmailPayloadSchema,
  type OrganizationInvitationPayload,
  type PasswordResetEmailPayload,
  type VerificationEmailPayload,
} from './contract'

/**
 * Moves SMTP off the request path. A slow or flaky mail server no longer delays
 * signup, and a transient failure is retried instead of losing the email.
 *
 * Concurrency is deliberately low: most SMTP providers rate-limit connections.
 */
export const transactionalEmailJob = defineJob({
  concurrency: 3,
  handlers: {
    [ORGANIZATION_INVITATION_JOB]: {
      schema: organizationInvitationPayloadSchema,
      handle: async (payload, context) => {
        context.log.info({ organizationName: payload.organizationName }, 'sending organization invitation')
        await sendOrganizationInvitation(payload)
      },
    },
    [PASSWORD_RESET_EMAIL_JOB]: {
      schema: passwordResetEmailPayloadSchema,
      handle: async (payload, context) => {
        context.log.info('sending password reset email')
        await sendPasswordResetEmail(payload)
      },
    },
    [VERIFICATION_EMAIL_JOB]: {
      schema: verificationEmailPayloadSchema,
      handle: async (payload, context) => {
        context.log.info('sending verification email')
        await sendVerificationEmail(payload)
      },
    },
  },
  queueName: TRANSACTIONAL_EMAIL_QUEUE,
})

/*
 * These emails use `enqueue` (not `enqueueBestEffort`): a user who cannot be
 * queued a verification link is stuck, so the request should fail loudly rather
 * than report success. Use `enqueueBestEffort` for work the user does not wait on.
 */

export function enqueueVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
  return transactionalEmailJob.enqueue(VERIFICATION_EMAIL_JOB, payload)
}

export function enqueuePasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
  return transactionalEmailJob.enqueue(PASSWORD_RESET_EMAIL_JOB, payload)
}

export function enqueueOrganizationInvitation(payload: OrganizationInvitationPayload): Promise<void> {
  return transactionalEmailJob.enqueue(ORGANIZATION_INVITATION_JOB, payload)
}

export * from './contract'
