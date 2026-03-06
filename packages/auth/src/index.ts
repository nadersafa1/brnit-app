import { expo } from '@better-auth/expo'
import { db } from '@burn-app/db'
import * as schema from '@burn-app/db/schema/auth'
import { env } from '@burn-app/env/server'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin, organization, openAPI } from 'better-auth/plugins'
import { sendOrganizationInvitation } from './emails/send-organization-invitation'
import { sendPasswordResetEmail } from './emails/send-password-reset-email'
import { sendVerificationEmail } from './emails/send-verification-email'
import {
  ac,
  client_admin,
  coach,
  direct_admin,
  member,
  nutritionist,
  owner,
} from './permissions'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN, 'mybettertapp://', 'exp://', 'brnit://'],
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            enabled: true,
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: sendPasswordResetEmail,
  },
  emailVerification: {
    sendVerificationEmail,
    sendOnSignUp: true,
    expiresIn: 60 * 60 * 24, // 24 hours
    autoSignInAfterVerification: true,
  },
  plugins: [
    nextCookies(),
    openAPI(),

    admin({ defaultRole: 'user' }),
    organization({
      ac,
      roles: {
        owner,
        client_admin,
        direct_admin,
        nutritionist,
        coach,
        member,
      },
      creatorRole: 'owner',
      membershipLimit: 100,
      allowUserToCreateOrganization: async (user) => user.role === 'admin',
      async sendInvitationEmail(data) {
        const appOrigin =
          env.CORS_ORIGIN?.replace(/\/$/, '') ||
          (env.BETTER_AUTH_URL
            ? new URL(env.BETTER_AUTH_URL).origin
            : 'http://localhost:3000')
        const inviteLink = `${appOrigin}/accept-invitation?invitationId=${data.id}`
        await sendOrganizationInvitation({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          organizationName: data.organization.name,
          inviteLink,
          invitationRole: data.invitation.role,
        })
      },
      organizationHooks: {
        beforeCreateInvitation: async ({ invitation, inviter }) => {
          if (invitation.role !== 'member') {
            if (!['org_admin', 'owner'].includes(inviter.role)) {
              throw new APIError('BAD_REQUEST', {
                message: 'You can only invite members with member role',
              })
            }
          }
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          return { data: { ...invitation, expiresAt } }
        },
      },
    }),
    expo(),
  ],
})
