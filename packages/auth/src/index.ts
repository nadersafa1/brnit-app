import { expo } from '@better-auth/expo'
import { db } from '@burn-app/db'
import { bodyCompositionAssessment } from '@burn-app/db/schema'
import * as schema from '@burn-app/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import { canInviteWithAnyRole, canUpdateMemberRole } from './authorization'
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
import { importPKCS8, SignJWT } from 'jose'

async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKeyPem: string,
) {
  const key = await importPKCS8(privateKeyPem, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)
}

const googleSocial =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          enabled: true,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}

const appleEnvReady = Boolean(
  env.APPLE_CLIENT_ID &&
  env.APPLE_TEAM_ID &&
  env.APPLE_KEY_ID &&
  env.APPLE_PRIVATE_KEY,
)

const applePrivateKeyPem = env.APPLE_PRIVATE_KEY.replaceAll('\\n', '\n')

const appleSocial = appleEnvReady
  ? {
      apple: {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: await generateAppleClientSecret(
          env.APPLE_CLIENT_ID,
          env.APPLE_TEAM_ID,
          env.APPLE_KEY_ID,
          applePrivateKeyPem,
        ),
        ...(env.APPLE_APP_BUNDLE_IDENTIFIER
          ? { appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER }
          : {}),
      },
    }
  : {}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    'https://appleid.apple.com',
    'mybettertapp://',
    'exp://',
    'brnit://',
  ],
  socialProviders: {
    ...googleSocial,
    ...appleSocial,
  },

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
  user: {
    additionalFields: {
      dob: {
        type: 'date',
        required: false,
        input: true,
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await db
          .delete(bodyCompositionAssessment)
          .where(eq(bodyCompositionAssessment.recordedById, user.id))
      },
    },
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
          // App admin can invite with any role
          if (inviter.role === 'admin') {
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            return { data: { ...invitation, expiresAt } }
          }
          // For non-member roles, check org role: owner or client_admin
          if (invitation.role !== 'member') {
            const membership = await db.query.member.findFirst({
              where: and(
                eq(schema.member.userId, inviter.id),
                eq(schema.member.organizationId, invitation.organizationId),
              ),
              columns: { role: true },
            })
            if (
              !canInviteWithAnyRole({
                appRole: null,
                orgRole: membership?.role ?? null,
              })
            ) {
              throw new APIError('BAD_REQUEST', {
                message:
                  'Only org owners, direct admins, or app admins can invite with non-member roles',
              })
            }
          }
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          return { data: { ...invitation, expiresAt } }
        },
        beforeUpdateMemberRole: async ({ user, organization }) => {
          if (user.role === 'admin') return undefined
          const membership = await db.query.member.findFirst({
            where: and(
              eq(schema.member.userId, user.id),
              eq(schema.member.organizationId, organization.id),
            ),
            columns: { role: true },
          })
          if (
            !canUpdateMemberRole({
              appRole: null,
              orgRole: membership?.role ?? null,
            })
          ) {
            throw new APIError('FORBIDDEN', {
              message:
                'Only app admins, org owners, or direct admins can change member roles',
            })
          }
          return undefined
        },
      },
    }),
    expo(),
  ],
})
