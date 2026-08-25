import { describe, expect, it } from "bun:test";

// `@brnit/env/server` validates at import time; these placeholders let the
// module graph load in a shell with no `.env`.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";

const { buildCloudinaryUrl, extractPublicId, isCloudinaryUrl } = await import(
	"./url"
);

/**
 * The cloud name comes from `test-setup.ts`, not from a literal here — the env
 * module freezes on first import, so a value hardcoded in one test file silently
 * disagrees with the rest of the suite.
 *
 * Only URLs that `buildCloudinaryUrl` *produces* need this. The parsing tests
 * below feed arbitrary URLs in, so their host is irrelevant and stays literal.
 */
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;

describe("buildCloudinaryUrl", () => {
	it("renders the delivery URL for a public id", () => {
		expect(buildCloudinaryUrl("profile/abc123")).toBe(
			`https://res.cloudinary.com/${CLOUD}/image/upload/profile/abc123`
		);
	});
});

describe("isCloudinaryUrl", () => {
	it("accepts Cloudinary hosts and rejects everything else", () => {
		expect(
			isCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/x")
		).toBe(true);
		expect(isCloudinaryUrl("https://lh3.googleusercontent.com/a/avatar")).toBe(
			false
		);
		expect(isCloudinaryUrl(null)).toBe(false);
		expect(isCloudinaryUrl(undefined)).toBe(false);
	});
});

describe("extractPublicId", () => {
	it("round-trips a URL this module built", () => {
		const url = buildCloudinaryUrl("profile/abc123");
		expect(extractPublicId(url)).toBe("profile/abc123");
	});

	it("drops the version segment and the file extension", () => {
		expect(
			extractPublicId(
				"https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg"
			)
		).toBe("sample");
	});

	it("keeps the folder prefix on a versioned foldered asset", () => {
		expect(
			extractPublicId(
				"https://res.cloudinary.com/demo/image/upload/v1710000000/profile/abc.webp"
			)
		).toBe("profile/abc");
	});

	it("ignores query strings", () => {
		expect(
			extractPublicId(
				"https://res.cloudinary.com/demo/image/upload/profile/abc.png?_a=xyz"
			)
		).toBe("profile/abc");
	});

	it("returns null for non-Cloudinary URLs", () => {
		expect(extractPublicId("https://lh3.googleusercontent.com/a/avatar")).toBe(
			null
		);
	});

	it("returns null when there is no upload segment", () => {
		expect(extractPublicId("https://res.cloudinary.com/demo/image/x.jpg")).toBe(
			null
		);
	});
});
