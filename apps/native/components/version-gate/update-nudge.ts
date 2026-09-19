import { Alert } from "react-native";

import {
	shouldShowNudge,
	useVersionNudgeStore,
} from "@/store/version-nudge-store";

import { openStoreUrl } from "./open-store-url";

interface UpdateNudgeOptions {
	latestVersion: string;
	message: string;
	storeUrl: string;
}

/**
 * A dismissible "there's a newer build" prompt, at most once a day per release.
 *
 * The throttle lives here rather than at the call site so no path can bypass
 * it: the gate re-checks on every foreground resume, and an unthrottled alert
 * would reappear each time the user came back from the home screen.
 *
 * The marker is written *before* the alert opens, so two checks landing in the
 * same tick (iOS emits `inactive` → `active` for a Control Centre peek) cannot
 * stack two alerts.
 */
export function showUpdateNudge({
	latestVersion,
	message,
	storeUrl,
}: UpdateNudgeOptions): void {
	if (!shouldShowNudge(latestVersion)) {
		return;
	}
	useVersionNudgeStore.getState().markNudgeShown(latestVersion);

	Alert.alert("Update Available", message, [
		{ text: "Update", onPress: () => openStoreUrl(storeUrl) },
		{ text: "Later", style: "cancel" },
	]);
}
