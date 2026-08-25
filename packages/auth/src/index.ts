/**
 * The Better Auth instance. Mounted by `apps/server` with
 * `toNodeHandler(auth)` on `/api/auth/*`, **before** `express.json()` — Better
 * Auth reads the raw request body itself and a JSON body parser upstream
 * breaks every POST.
 *
 * There is deliberately no `nextCookies()` plugin: the API is a standalone
 * Express app now, not Next.js route handlers.
 */
import { expo } from "@better-auth/expo";
import { createDbClient } from "@brnit/db";
import { bodyCompositionAssessment } from "@brnit/db/schema";
import {
	account,
	invitation,
	member as memberTable,
	organization as organizationTable,
	session,
	user as userTable,
	verification,
} from "@brnit/db/schema/auth";
import { DEFAULT_APP_ROLE, isAppAdmin } from "@brnit/domain";
import { env } from "@brnit/env/server";
import { getLogger } from "@brnit/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, openAPI, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { sendOrganizationInvitation } from "./emails/send-organization-invitation";
import { sendPasswordResetEmail } from "./emails/send-password-reset-email";
import { sendVerificationEmail } from "./emails/send-verification-email";
import {
	createOrganizationHooks,
	createOrgRoleLookup,
} from "./organization-hooks";
import {
	ac,
	client_admin,
	coach,
	direct_admin,
	member,
	nutritionist,
	owner,
} from "./permissions";
import { ORG_CREATOR_ROLE, ORG_MEMBERSHIP_LIMIT } from "./role-ranks";
import { resolveWebAppOrigin } from "./send-email";
import {
	appleConfigState,
	googleConfigState,
	type ProviderConfigState,
	resolveAppleSocialProvider,
	resolveGoogleSocialProvider,
} from "./social-providers";

const EMAIL_VERIFICATION_EXPIRY_SECONDS = 60 * 60 * 24;

/**
 * Isolated Drizzle client with its own pool, so Better Auth's internal reads and
 * the `beforeDelete` cleanup never share request-scoped transaction state with
 * the API handlers. Same reasoning as `qpadel/packages/auth/src/index.ts`.
 */
const db = createDbClient();

/**
 * The seven tables Better Auth owns, named explicitly so the adapter never sees
 * the Drizzle `relations()` helpers exported alongside them.
 */
const betterAuthSchema = {
	account,
	invitation,
	member: memberTable,
	organization: organizationTable,
	session,
	user: userTable,
	verification,
};

const appleConfig = {
	appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
	clientId: env.APPLE_CLIENT_ID,
	keyId: env.APPLE_KEY_ID,
	privateKey: env.APPLE_PRIVATE_KEY,
	teamId: env.APPLE_TEAM_ID,
};
const googleConfig = {
	clientId: env.GOOGLE_CLIENT_ID,
	clientSecret: env.GOOGLE_CLIENT_SECRET,
};

/**
 * A half-configured provider is silently disabled, which in production looks
 * exactly like "OAuth is broken". Say so once, at boot.
 */
function warnIfPartiallyConfigured(
	provider: string,
	state: ProviderConfigState
): void {
	if (state === "partial") {
		getLogger().warn(
			{ provider },
			"social provider is partially configured and stays disabled"
		);
	}
}

warnIfPartiallyConfigured("apple", appleConfigState(appleConfig));
warnIfPartiallyConfigured("google", googleConfigState(googleConfig));

/** Resolved at module load because the Apple client secret is signed asynchronously. */
const googleSocial = resolveGoogleSocialProvider(googleConfig);
const appleSocial = await resolveAppleSocialProvider(appleConfig);

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: betterAuthSchema,
	}),

	/**
	 * The SPA, the Expo app and Apple's OAuth callback all post to this API from
	 * a different origin than their own. Native schemes need the `://**` form as
	 * well as the bare scheme; the Expo dev-server origins are development-only
	 * so a production deployment cannot be driven from a laptop.
	 */
	trustedOrigins: [
		...env.CORS_ORIGIN,
		"https://appleid.apple.com",
		"brnit://",
		"brnit://**",
		...(env.NODE_ENV === "development"
			? ["exp://", "exp://**", "http://localhost:8081"]
			: []),
	],

	/**
	 * The web app is served from a different origin than this API, so the
	 * session cookie is cross-site: browsers drop it unless it is
	 * `SameSite=None; Secure`. That pair also requires HTTPS on both origins.
	 */
	advanced: {
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "none",
			secure: true,
		},
	},

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
		autoSignInAfterVerification: true,
		expiresIn: EMAIL_VERIFICATION_EXPIRY_SECONDS,
		sendOnSignUp: true,
		sendVerificationEmail,
	},

	user: {
		additionalFields: {
			/** The only additional field; maps to the real `user.dob` `date` column. */
			dob: {
				input: true,
				required: false,
				type: "date",
			},
		},
		deleteUser: {
			enabled: true,
			/**
			 * `body_composition_assessment.recorded_by_id` is `NO ACTION`, so the
			 * user row cannot be removed while any assessment they recorded still
			 * points at it. Without this the whole delete-account flow fails.
			 */
			beforeDelete: async (user) => {
				await db
					.delete(bodyCompositionAssessment)
					.where(eq(bodyCompositionAssessment.recordedById, user.id));
			},
		},
	},

	plugins: [
		openAPI(),
		admin({ defaultRole: DEFAULT_APP_ROLE }),
		organization({
			ac,
			roles: {
				client_admin,
				coach,
				direct_admin,
				member,
				nutritionist,
				owner,
			},
			creatorRole: ORG_CREATOR_ROLE,
			membershipLimit: ORG_MEMBERSHIP_LIMIT,
			allowUserToCreateOrganization: (user) => isAppAdmin(user.role),
			sendInvitationEmail: async (data) => {
				// The Vite app serves `/accept-invitation`; native opens the same
				// query on `brnit://accept-invitation?invitationId=`.
				const inviteLink = `${resolveWebAppOrigin()}/accept-invitation?invitationId=${encodeURIComponent(data.id)}`;
				await sendOrganizationInvitation({
					email: data.email,
					invitationRole: data.invitation.role,
					invitedByEmail: data.inviter.user.email,
					invitedByUsername: data.inviter.user.name,
					inviteLink,
					organizationName: data.organization.name,
				});
			},
			organizationHooks: createOrganizationHooks(createOrgRoleLookup(db)),
		}),
		expo(),
	],
});
