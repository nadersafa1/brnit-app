import { expect, test } from "bun:test";

/**
 * The module must import cleanly with no Apple credentials, because that is
 * every local dev machine and every deployment without Sign in with Apple.
 * `apps/server` imports `@brnit/auth` during bootstrap, so a throw here is a
 * dead API rather than a dead login button.
 *
 * Env is seeded at module scope so it is in place before the dynamic import
 * below reaches `@brnit/env/server`. Empty strings rather than deletes:
 * `dotenv/config` only fills keys absent from `process.env`, and
 * `emptyStringAsUndefined` turns these back into `undefined`.
 */
const REQUIRED_ENV: Record<string, string> = {
	BETTER_AUTH_SECRET: "test-secret-value-that-is-long-enough-32",
	BETTER_AUTH_URL: "http://localhost:3000",
	CORS_ORIGIN: "http://localhost:5173",
	DATABASE_URL: "postgres://brnit:brnit@127.0.0.1:5432/brnit_test",
	NODE_ENV: "test",
};

const BLANKED_ENV = [
	"APPLE_APP_BUNDLE_IDENTIFIER",
	"APPLE_CLIENT_ID",
	"APPLE_KEY_ID",
	"APPLE_PRIVATE_KEY",
	"APPLE_TEAM_ID",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
] as const;

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
	process.env[key] ??= value;
}
for (const key of BLANKED_ENV) {
	process.env[key] = "";
}

test("builds the auth instance without Apple or Google credentials", async () => {
	const { auth } = await import("./index");

	expect(typeof auth.handler).toBe("function");
	expect(auth.options.socialProviders).toEqual({});
});

test("registers dob as the only additional user field", async () => {
	const { auth } = await import("./index");

	expect(auth.options.user?.additionalFields).toEqual({
		dob: { input: true, required: false, type: "date" },
	});
});

test("deletes assessments recorded by the user before deleting the user", async () => {
	const { auth } = await import("./index");

	// The FK on `body_composition_assessment.recorded_by_id` is NO ACTION, so
	// account deletion fails outright if this hook is ever dropped.
	expect(typeof auth.options.user?.deleteUser?.beforeDelete).toBe("function");
	expect(auth.options.user?.deleteUser?.enabled).toBe(true);
});
