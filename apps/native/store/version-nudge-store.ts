/**
 * When the update nudge was last shown, and for which release.
 *
 * Persisted with `expo-secure-store` behind a synchronous load, matching
 * `app-settings-store` — the marker has to be readable before the first version
 * check resolves, so an async hydrate would let one un-throttled nudge through
 * on every cold start.
 */
import { getItem, setItemAsync } from "expo-secure-store";
import { create } from "zustand";

const STORAGE_KEY = "brnit_version_nudge";

/** How long one shown nudge suppresses the next for the same release. */
const NUDGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface VersionNudgeState {
	/** Epoch ms of the last nudge; 0 when it has never been shown. */
	lastShownAt: number;
	/** The `latestVersion` that last nudge advertised. */
	lastShownVersion: string;
}

interface VersionNudgeActions {
	markNudgeShown: (latestVersion: string) => void;
}

type VersionNudgeStore = VersionNudgeState & VersionNudgeActions;

const DEFAULT_STATE: VersionNudgeState = {
	lastShownAt: 0,
	lastShownVersion: "",
};

function loadStateSync(): VersionNudgeState {
	try {
		const stored = getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<VersionNudgeState>;
			return { ...DEFAULT_STATE, ...parsed };
		}
	} catch (error) {
		console.error("[VersionNudge] Failed to load state:", error);
	}
	return DEFAULT_STATE;
}

export const useVersionNudgeStore = create<VersionNudgeStore>((set) => ({
	...loadStateSync(),

	markNudgeShown: (latestVersion) => {
		const next: VersionNudgeState = {
			lastShownAt: Date.now(),
			lastShownVersion: latestVersion,
		};
		set(next);
		setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch((error) => {
			console.error("[VersionNudge] Failed to persist state:", error);
		});
	},
}));

/**
 * Whether the nudge for `latestVersion` is due.
 *
 * A *different* release always shows straight away — a new build is worth one
 * interruption. The *same* release is held for a day, so tapping "Later" is not
 * undone by the next foreground resume.
 *
 * This throttles the nudge only. Blocking is never throttled: see
 * `VersionGateProvider`, which renders the block from the live response and
 * never consults this store.
 */
export function shouldShowNudge(latestVersion: string): boolean {
	const { lastShownAt, lastShownVersion } = useVersionNudgeStore.getState();
	if (lastShownVersion !== latestVersion) {
		return true;
	}
	return Date.now() - lastShownAt >= NUDGE_INTERVAL_MS;
}
