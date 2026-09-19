import { Linking } from "react-native";

/**
 * Opens the store listing the server handed back.
 *
 * Shared by the blocked screen and the nudge so both swallow the same failure:
 * a rejected `openURL` (blank or malformed `storeUrl`) must not throw into a
 * render or an `Alert` callback.
 */
export function openStoreUrl(storeUrl: string): void {
	Linking.openURL(storeUrl).catch((error) => {
		console.error("[VersionGate] Failed to open store URL:", error);
	});
}
