import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const TRAILING_SLASHES = /\/+$/;

/** Split comma-separated origins, trim, strip trailing slashes (a browser `Origin` header never has a path). */
function parseCorsOrigins(raw: string): string[] {
	return raw
		.split(",")
		.map((part) => part.trim().replace(TRAILING_SLASHES, ""))
		.filter((part) => part.length > 0);
}

const corsOriginsSchema = z
	.string()
	.min(1)
	.transform(parseCorsOrigins)
	.pipe(z.array(z.url()).min(1));

/** Clamp `value` into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

const MIN_PORT = 1;
const MAX_PORT = 65_535;
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_SMTP_PORT = 465;
const MIN_SECRET_LENGTH = 32;

const CONSUMPTION_PAST_DAYS_DEFAULT = 2;
const CONSUMPTION_PAST_DAYS_MIN = 0;
const CONSUMPTION_PAST_DAYS_MAX = 365;

const CONSUMPTION_GRACE_DAYS_DEFAULT = 2;
const CONSUMPTION_GRACE_DAYS_MIN = 0;

const TOLERANCE_PCT_DEFAULT = 15;
const TOLERANCE_PCT_MIN = 1;
const TOLERANCE_PCT_MAX = 100;

/**
 * Whole days in the past a member may still log a meal consumption for.
 * Out-of-range values are clamped rather than rejected so a bad deploy
 * degrades to a sane window instead of refusing to boot.
 */
const maxConsumptionPastDaysSchema = z.coerce
	.number()
	.int()
	.default(CONSUMPTION_PAST_DAYS_DEFAULT)
	.transform((days) =>
		clamp(days, CONSUMPTION_PAST_DAYS_MIN, CONSUMPTION_PAST_DAYS_MAX)
	);

/** Macro tolerance percentage for food-item alternatives; clamped to 1-100. */
const tolerancePctSchema = z.coerce
	.number()
	.int()
	.default(TOLERANCE_PCT_DEFAULT)
	.transform((pct) => clamp(pct, TOLERANCE_PCT_MIN, TOLERANCE_PCT_MAX));

/** `"true"` enables the flag; every other value (including unset) disables it. Never throws. */
const optionalFlagSchema = z
	.string()
	.default("false")
	.transform((value) => value === "true");

const portSchema = z.coerce.number().int().min(MIN_PORT).max(MAX_PORT);

export const env = createEnv({
	server: {
		/** Postgres connection string used by Drizzle (`postgresql://user:pass@host:5432/db`). */
		DATABASE_URL: z.string().min(1),
		/** better-auth signing secret; must be at least 32 characters of high-entropy random data. */
		BETTER_AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH),
		/** Public origin the API is reachable at, used as better-auth `baseURL` (e.g. `https://api.brnit.app`). */
		BETTER_AUTH_URL: z.url(),
		/** Comma-separated list of allowed browser origins; parsed into a validated URL array. */
		CORS_ORIGIN: corsOriginsSchema,
		/** Runtime mode. Drives log level, rate limiting and the production-only guards below. */
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		/** HTTP listen port for the Express server. */
		PORT: portSchema.default(DEFAULT_HTTP_PORT),

		/** SMTP host for transactional email (verification, password reset, invitations). */
		NODEMAILER_HOST: z.string().optional(),
		/** SMTP username; also used as the `from` address. */
		NODEMAILER_USER: z.string().optional(),
		/** SMTP app password. Never commit this value. */
		NODEMAILER_APP_PASSWORD: z.string().optional(),
		/** SMTP port. Defaults to 465 because the transport is created with `secure: true`. */
		NODEMAILER_PORT: portSchema.default(DEFAULT_SMTP_PORT),

		/** Google OAuth client id (web + native). Optional so local dev boots before secrets exist. */
		GOOGLE_CLIENT_ID: z.string().optional(),
		/** Google OAuth client secret. Never commit this value. */
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		/** Sign in with Apple Service ID; paired with a JWT client secret signed from the `.p8` key. */
		APPLE_CLIENT_ID: z.string().optional(),
		/** Apple developer team id that owns the Service ID and the `.p8` key. */
		APPLE_TEAM_ID: z.string().optional(),
		/** Key id of the Apple `.p8` signing key. */
		APPLE_KEY_ID: z.string().optional(),
		/** Apple `.p8` PEM contents; use `\n` escapes in `.env` for newlines. */
		APPLE_PRIVATE_KEY: z.string().optional(),
		/** Native iOS idToken `aud`; must match the Expo `ios.bundleIdentifier`. Optional for web OAuth. */
		APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),

		/** Cloudinary cloud name; also the `{cloud}` segment of every generated `imageUrl`. */
		CLOUDINARY_CLOUD_NAME: z.string().optional(),
		/** Cloudinary API key for server-side uploads and destroys. */
		CLOUDINARY_API_KEY: z.string().optional(),
		/** Cloudinary API secret. Never commit this value. */
		CLOUDINARY_API_SECRET: z.string().optional(),

		/** Redis connection string for BullMQ queues and the socket.io adapter. Required in production. */
		REDIS_URL: z
			.url()
			.optional()
			.refine(
				(url) => process.env.NODE_ENV !== "production" || url !== undefined,
				"REDIS_URL is required when NODE_ENV is production"
			),

		/** Firebase project id for FCM. Optional locally; required in production to send push. */
		FIREBASE_PROJECT_ID: z.string().optional(),
		/**
		 * Firebase service account credentials for firebase-admin, raw JSON or base64.
		 * Prefer base64 in compose `.env` files — multiline JSON breaks env-file parsing.
		 * Never commit this value.
		 */
		FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),

		/** When `"true"`, write an audit row for every POST/PUT/PATCH/DELETE request. */
		AUDIT_LOG_DB_ENABLED: optionalFlagSchema,
		/**
		 * Pino log level (`trace` | `debug` | `info` | `warn` | `error` | `fatal` | `silent`).
		 * Validated in `@brnit/logger`; an unrecognized value falls back to the NODE_ENV default
		 * rather than failing the boot.
		 */
		LOG_LEVEL: z.string().optional(),

		/** Days in the past a member may still log a meal consumption for. Default 2, clamped 0-365. */
		MAX_CONSUMPTION_PAST_DAYS: maxConsumptionPastDaysSchema,
		/** Days after a diet plan assignment ends that consumption logging stays open. Default 2, minimum 0. */
		DIET_PLAN_CONSUMPTION_GRACE_DAYS: z.coerce
			.number()
			.int()
			.default(CONSUMPTION_GRACE_DAYS_DEFAULT)
			.transform((days) => Math.max(days, CONSUMPTION_GRACE_DAYS_MIN)),

		/** Calorie tolerance (%) when matching food-item alternatives. Default 15, clamped 1-100. */
		ALTERNATIVES_TOLERANCE_CAL_PCT: tolerancePctSchema,
		/** Protein tolerance (%) when matching food-item alternatives. Default 15, clamped 1-100. */
		ALTERNATIVES_TOLERANCE_PROTEIN_PCT: tolerancePctSchema,
		/** Carbohydrate tolerance (%) when matching food-item alternatives. Default 15, clamped 1-100. */
		ALTERNATIVES_TOLERANCE_CARBS_PCT: tolerancePctSchema,
		/** Fat tolerance (%) when matching food-item alternatives. Default 15, clamped 1-100. */
		ALTERNATIVES_TOLERANCE_FAT_PCT: tolerancePctSchema,
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

const isProduction = env.NODE_ENV === "production";

const emailConfigured =
	env.NODEMAILER_HOST !== undefined &&
	env.NODEMAILER_USER !== undefined &&
	env.NODEMAILER_APP_PASSWORD !== undefined;

if (isProduction && !emailConfigured) {
	console.warn(
		"[env] NODEMAILER_HOST, NODEMAILER_USER and NODEMAILER_APP_PASSWORD are not all set; transactional email is disabled"
	);
}

const cloudinaryConfigured =
	env.CLOUDINARY_CLOUD_NAME !== undefined &&
	env.CLOUDINARY_API_KEY !== undefined &&
	env.CLOUDINARY_API_SECRET !== undefined;

if (isProduction && !cloudinaryConfigured) {
	console.warn(
		"[env] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are not all set; image upload is disabled"
	);
}

const firebaseConfigured =
	env.FIREBASE_PROJECT_ID !== undefined &&
	env.FIREBASE_SERVICE_ACCOUNT_JSON !== undefined;

if (isProduction && !firebaseConfigured) {
	console.warn(
		"[env] FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON are not set; push notifications are disabled"
	);
}
