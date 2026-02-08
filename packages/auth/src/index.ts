import { expo } from "@better-auth/expo";
import { db } from "@burn-app/db";
import * as schema from "@burn-app/db/schema/auth";
import { env } from "@burn-app/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { sendPasswordResetEmail } from "./emails/send-password-reset-email";
import { sendVerificationEmail } from "./emails/send-verification-email";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN, "mybettertapp://", "exp://", "brnit://"],
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
  plugins: [nextCookies(), admin({ defaultRole: "user" }), expo()],
});
