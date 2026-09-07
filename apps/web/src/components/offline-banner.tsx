import { WifiOffIcon } from "lucide-react";

import { useNetworkStore } from "@/stores/network-store";

/**
 * Sits above everything so the reason requests are failing is stated once,
 * instead of once per failed query. While it is showing, the global query error
 * toast is suppressed (see `utils/query-client.ts`).
 */
export function OfflineBanner() {
	const isOnline = useNetworkStore((state) => state.isOnline);

	if (isOnline) {
		return null;
	}

	return (
		<div
			className="flex shrink-0 items-center justify-center gap-2 bg-chrome px-4 py-2 text-chrome-foreground text-xs"
			role="status"
		>
			<WifiOffIcon aria-hidden className="size-4" />
			You're offline. Changes can't be saved until the connection is back.
		</div>
	);
}
