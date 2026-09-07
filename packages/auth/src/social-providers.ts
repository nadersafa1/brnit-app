/**
 * Social provider configuration, resolved from plain config objects rather than
 * from `env` directly so the rules are unit-testable and so a missing secret can
 * never take the process down.
 *
 * Both resolvers are all-or-nothing: unless every field a provider needs is
 * present they return `{}` and Better Auth simply does not register the
 * provider. This matters because `@brnit/auth` is imported during
 * `apps/server` bootstrap — a throw here is a dead API, not a dead login
 * button.
 */
import { importPKCS8, SignJWT } from "jose";

/** Apple caps client-secret JWTs at six months; 180 days keeps a margin. */
const APPLE_CLIENT_SECRET_TTL_SECONDS = 180 * 24 * 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;

export type ProviderConfigState = "absent" | "configured" | "partial";

export interface GoogleProviderConfig {
	clientId?: string | undefined;
	clientSecret?: string | undefined;
}

export interface AppleProviderConfig {
	/** iOS bundle id. Adds a second accepted `aud` for native `idToken` sign-in. */
	appBundleIdentifier?: string | undefined;
	/** Apple *Service ID*, not the bundle id. */
	clientId?: string | undefined;
	keyId?: string | undefined;
	/** `.p8` PEM contents. `\n` escapes are expanded before signing. */
	privateKey?: string | undefined;
	teamId?: string | undefined;
}

function configState(
	values: readonly (string | undefined)[]
): ProviderConfigState {
	const present = values.filter((value) => Boolean(value)).length;
	if (present === 0) {
		return "absent";
	}
	if (present === values.length) {
		return "configured";
	}
	return "partial";
}

/** `configured` only when both credentials are present. */
export function googleConfigState(
	config: GoogleProviderConfig
): ProviderConfigState {
	return configState([config.clientId, config.clientSecret]);
}

/**
 * `configured` only when all four *required* Apple values are present.
 * `appBundleIdentifier` is genuinely optional and is not counted.
 */
export function appleConfigState(
	config: AppleProviderConfig
): ProviderConfigState {
	return configState([
		config.clientId,
		config.teamId,
		config.keyId,
		config.privateKey,
	]);
}

/**
 * Apple does not issue a static client secret: it is an ES256 JWT you sign
 * yourself with the `.p8` key, valid for at most six months.
 */
async function generateAppleClientSecret(
	clientId: string,
	teamId: string,
	keyId: string,
	privateKeyPem: string
): Promise<string> {
	const key = await importPKCS8(privateKeyPem, "ES256");
	const now = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
	return await new SignJWT({})
		.setProtectedHeader({ alg: "ES256", kid: keyId })
		.setIssuer(teamId)
		.setSubject(clientId)
		.setAudience("https://appleid.apple.com")
		.setIssuedAt(now)
		.setExpirationTime(now + APPLE_CLIENT_SECRET_TTL_SECONDS)
		.sign(key);
}

/** Google for web and native, or `{}` when either credential is missing. */
export function resolveGoogleSocialProvider(config: GoogleProviderConfig) {
	const { clientId, clientSecret } = config;
	if (!(clientId && clientSecret)) {
		return {};
	}
	return {
		google: {
			clientId,
			clientSecret,
			enabled: true,
		},
	};
}

/**
 * Sign in with Apple, or `{}` when any required value is missing.
 *
 * The PEM is only touched inside the guarded branch: `APPLE_PRIVATE_KEY` is
 * optional in `@brnit/env/server`, so reading `.replaceAll` on it
 * unconditionally throws `TypeError` on every environment without Apple
 * configured — which is every local dev machine.
 */
export async function resolveAppleSocialProvider(config: AppleProviderConfig) {
	const { appBundleIdentifier, clientId, keyId, privateKey, teamId } = config;
	if (!(clientId && teamId && keyId && privateKey)) {
		return {};
	}
	const privateKeyPem = privateKey.replaceAll(String.raw`\n`, "\n");
	const clientSecret = await generateAppleClientSecret(
		clientId,
		teamId,
		keyId,
		privateKeyPem
	);
	return {
		apple: {
			clientId,
			clientSecret,
			...(appBundleIdentifier
				? { audience: [clientId, appBundleIdentifier] }
				: {}),
		},
	};
}
