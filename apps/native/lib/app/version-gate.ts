import type { AppVersionResponse } from "@brnit/api";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { apiFetch } from "@/lib/api/client";

/**
 * The "carry on" decision.
 *
 * Used wherever the gate has nothing to say — a build that reports no version,
 * and as the provider's starting state before the first check answers. It is
 * deliberately the exact shape the server returns for `none`, so no caller ever
 * has to branch on an "unknown yet" third state.
 */
export const NO_VERSION_RESULT: AppVersionResponse = {
	action: "none",
	latestVersion: "",
	message: "",
	storeUrl: "",
};

/**
 * Asks the server what this build should do.
 *
 * The comparison is server-side **on purpose** (see `AppVersionAction` in
 * `@brnit/api`): a client-side comparison could only be changed by shipping a
 * new build, which is precisely the situation the gate exists to rescue. This
 * function reports what it is running and renders the verdict — it never
 * inspects `latestVersion` to decide anything itself.
 *
 * Rejects on network or server failure; every caller must fail open.
 */
export function checkAppVersion(): Promise<AppVersionResponse> {
	const version = Constants.expoConfig?.version;
	if (!version) {
		return Promise.resolve(NO_VERSION_RESULT);
	}

	// Only the two store platforms are ever configured. Anything else (web)
	// is folded into "android" rather than left undecided.
	const platform = Platform.OS === "ios" ? "ios" : "android";

	// The path stays unversioned: `apiFetch` rewrites `/api/…` to
	// `/api/v{EXPO_PUBLIC_API_VERSION}/…` so the prefix lives in one place.
	return apiFetch<AppVersionResponse>(
		`/api/app-version?platform=${platform}&version=${encodeURIComponent(version)}`
	);
}
