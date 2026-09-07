import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const CONSUMPTION_PAST_DAYS_DEFAULT = 2;
const CONSUMPTION_PAST_DAYS_MAX = 365;

/**
 * `EXPO_PUBLIC_*` values must exist at **EAS build** time (EAS Environment
 * Variables or `eas.json` → `env`) because Metro inlines them into the bundle.
 *
 * Two consequences shape this file:
 *
 * 1. `runtimeEnv` is enumerated explicitly — Metro only substitutes literal
 *    `process.env.X` reads, so spreading `process.env` yields `undefined`.
 * 2. Every variable has a `.default(...)`. A missing build-time value must
 *    degrade to a working placeholder rather than throw and crash the app on
 *    launch, which is unrecoverable for an already-shipped binary.
 */
export const env = createEnv({
	clientPrefix: "EXPO_PUBLIC_",
	client: {
		/** Origin of the Express API. Set the real URL per EAS build profile. */
		EXPO_PUBLIC_SERVER_URL: z.url().default("https://api.brnit.app"),
		/** API major version mounted at `/api/v{n}`. */
		EXPO_PUBLIC_API_VERSION: z.coerce.number().int().min(1).default(1),
		/** Days in the past a member may still log a meal consumption for. Mirrors the server clamp. */
		EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS: z.coerce
			.number()
			.int()
			.min(0)
			.max(CONSUMPTION_PAST_DAYS_MAX)
			.default(CONSUMPTION_PAST_DAYS_DEFAULT),
	},
	runtimeEnv: {
		EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
		EXPO_PUBLIC_API_VERSION: process.env.EXPO_PUBLIC_API_VERSION,
		EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS:
			process.env.EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS,
	},
	emptyStringAsUndefined: true,
});
