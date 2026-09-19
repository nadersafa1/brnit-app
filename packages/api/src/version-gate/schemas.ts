import { isVersionBelow } from "@brnit/domain";
import { z } from "zod";

/**
 * Input schemas for the app version gate.
 *
 * The public query arrives from `req.query`, so both fields are strings and
 * nothing here coerces — `version` is compared by `isVersionBelow`, which reads
 * dotted numerics and never throws.
 */

const MIN_ABOVE_LATEST_MESSAGE =
	"minVersion must not be greater than latestVersion";

/** `GET /app-version?platform=…&version=…`. */
export const appVersionQuerySchema = z.object({
	platform: z.enum(["ios", "android"]),
	version: z.string().min(1),
});

export type AppVersionQuery = z.infer<typeof appVersionQuerySchema>;

/**
 * One platform's configuration in the admin `PUT` body.
 *
 * Every field is required and non-empty: a blank `message` or `storeUrl` would
 * strand a blocked user on a dead-end screen with nothing to read and nowhere
 * to go, which is worse than not gating at all.
 *
 * The cross-field check rejects `minVersion > latestVersion`. That combination
 * is not merely odd, it is unsatisfiable — it blocks every build including the
 * newest one in the store, so there is no version the user could update *to*.
 * The issue is reported on `minVersion` because that is the field the admin
 * almost always mistyped.
 */
export const appVersionConfigSchema = z
	.object({
		latestVersion: z.string().min(1),
		message: z.string().min(1),
		minVersion: z.string().min(1),
		storeUrl: z.url(),
	})
	.superRefine((value, ctx) => {
		if (isVersionBelow(value.latestVersion, value.minVersion)) {
			ctx.addIssue({
				code: "custom",
				message: MIN_ABOVE_LATEST_MESSAGE,
				path: ["minVersion"],
			});
		}
	});

export type AppVersionConfigInput = z.infer<typeof appVersionConfigSchema>;

/**
 * `PUT /admin/version-gate` body.
 *
 * Both platforms are optional and an omitted one is left **untouched**, so the
 * admin screen can save iOS without having to resend — and possibly clobber —
 * whatever Android currently holds. An empty body is therefore a valid no-op.
 */
export const adminVersionGatePutBodySchema = z.object({
	android: appVersionConfigSchema.optional(),
	ios: appVersionConfigSchema.optional(),
});

export type AdminVersionGatePutBody = z.infer<
	typeof adminVersionGatePutBodySchema
>;
