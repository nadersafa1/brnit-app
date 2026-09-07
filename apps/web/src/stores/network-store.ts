import { onlineManager } from "@tanstack/react-query";
import { create } from "zustand";

interface NetworkState {
	isOnline: boolean;
}

export const useNetworkStore = create<NetworkState>(() => ({
	isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
}));

/**
 * Mirrors browser and TanStack Query online state into a store the UI can read.
 *
 * TanStack's own `onlineManager` listeners stay in place — this only reflects
 * the state so `<OfflineBanner/>` and the global error toast can branch on it.
 */
export function initNetworkManager(): void {
	if (typeof window === "undefined") {
		return;
	}

	const syncFromNavigator = () => {
		useNetworkStore.setState({ isOnline: navigator.onLine });
	};

	window.addEventListener("online", syncFromNavigator);
	window.addEventListener("offline", syncFromNavigator);
	syncFromNavigator();

	onlineManager.subscribe((isOnline) => {
		useNetworkStore.setState({ isOnline });
	});
}
