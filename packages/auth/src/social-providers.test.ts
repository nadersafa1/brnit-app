import { describe, expect, it } from "bun:test";
import { decodeJwt, decodeProtectedHeader } from "jose";

import {
	appleConfigState,
	googleConfigState,
	resolveAppleSocialProvider,
	resolveGoogleSocialProvider,
} from "./social-providers";

/**
 * Throwaway P-256 key generated for this test only. Apple ships the real one as
 * a `.p8` file whose newlines are `\n`-escaped in the environment, which is
 * the form the resolver has to expand.
 */
const TEST_PRIVATE_KEY_ESCAPED =
	"-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgNwvRaoWW0UUE4jKX\n3iOOGTKDqQTYVm2Cdx5/J68ZN/ehRANCAAR+TMQ4PzcCYjF1Q5VNPSOKcypgy1eY\n9goQJUQjKQNcU6Hq8WCmEOeKc237RFLjyHr8+CYhVeE4UgyG+5v5QYSu\n-----END PRIVATE KEY-----";

const FULL_APPLE_CONFIG = {
	clientId: "app.brnit.service",
	keyId: "ABC123DEFG",
	privateKey: TEST_PRIVATE_KEY_ESCAPED,
	teamId: "TEAM123456",
};

describe("googleConfigState", () => {
	it("reports absent, partial and configured", () => {
		expect(googleConfigState({})).toBe("absent");
		expect(googleConfigState({ clientId: "id" })).toBe("partial");
		expect(googleConfigState({ clientId: "id", clientSecret: "s" })).toBe(
			"configured"
		);
	});

	it("treats an empty string as unset", () => {
		expect(googleConfigState({ clientId: "", clientSecret: "" })).toBe(
			"absent"
		);
	});
});

describe("appleConfigState", () => {
	it("ignores the optional bundle identifier", () => {
		expect(appleConfigState({ appBundleIdentifier: "app.brnit" })).toBe(
			"absent"
		);
		expect(appleConfigState(FULL_APPLE_CONFIG)).toBe("configured");
	});

	it("reports a missing private key as partial", () => {
		expect(
			appleConfigState({ ...FULL_APPLE_CONFIG, privateKey: undefined })
		).toBe("partial");
	});
});

describe("resolveGoogleSocialProvider", () => {
	it("returns an empty object when either credential is missing", () => {
		expect(resolveGoogleSocialProvider({})).toEqual({});
		expect(resolveGoogleSocialProvider({ clientId: "id" })).toEqual({});
		expect(resolveGoogleSocialProvider({ clientSecret: "s" })).toEqual({});
	});

	it("enables the provider when both credentials are present", () => {
		expect(
			resolveGoogleSocialProvider({ clientId: "id", clientSecret: "s" })
		).toEqual({
			google: { clientId: "id", clientSecret: "s", enabled: true },
		});
	});
});

describe("resolveAppleSocialProvider", () => {
	it("returns an empty object when nothing is configured", async () => {
		expect(await resolveAppleSocialProvider({})).toEqual({});
	});

	it("never reads the private key when Apple is unconfigured", async () => {
		// Regression: reading `.replaceAll` on an undefined `APPLE_PRIVATE_KEY`
		// threw at module load and took the whole server down on boot.
		await expect(
			resolveAppleSocialProvider({ privateKey: undefined })
		).resolves.toEqual({});
	});

	it("returns an empty object when any required value is missing", async () => {
		for (const missing of [
			"clientId",
			"keyId",
			"privateKey",
			"teamId",
		] as const) {
			const config = { ...FULL_APPLE_CONFIG, [missing]: undefined };
			expect(await resolveAppleSocialProvider(config)).toEqual({});
		}
	});

	it("signs an ES256 client secret scoped to Apple", async () => {
		const resolved = await resolveAppleSocialProvider(FULL_APPLE_CONFIG);
		const apple = "apple" in resolved ? resolved.apple : undefined;
		expect(apple).toBeDefined();
		if (!apple) {
			return;
		}

		expect(apple.clientId).toBe(FULL_APPLE_CONFIG.clientId);
		expect(decodeProtectedHeader(apple.clientSecret)).toMatchObject({
			alg: "ES256",
			kid: FULL_APPLE_CONFIG.keyId,
		});

		const claims = decodeJwt(apple.clientSecret);
		expect(claims.iss).toBe(FULL_APPLE_CONFIG.teamId);
		expect(claims.sub).toBe(FULL_APPLE_CONFIG.clientId);
		expect(claims.aud).toBe("https://appleid.apple.com");
		expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(180 * 24 * 60 * 60);
	});

	it("omits audience unless a bundle identifier is configured", async () => {
		const withoutBundle = await resolveAppleSocialProvider(FULL_APPLE_CONFIG);
		expect(withoutBundle).not.toHaveProperty("apple.audience");

		const withBundle = await resolveAppleSocialProvider({
			...FULL_APPLE_CONFIG,
			appBundleIdentifier: "app.brnit.native",
		});
		expect(withBundle).toHaveProperty("apple.audience", [
			FULL_APPLE_CONFIG.clientId,
			"app.brnit.native",
		]);
	});
});
