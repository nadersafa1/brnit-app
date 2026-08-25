import { toast } from "sonner";

const DEDUP_WINDOW_MS = 5000;
const recentToasts = new Map<string, number>();

/**
 * One toast per distinct message per 5 s.
 *
 * A single screen can run several queries that all fail for the same reason
 * (the session expired, the network dropped), and without this the user gets a
 * stack of identical toasts instead of one actionable one.
 */
export function showDedupedErrorToast(
	message: string,
	options?: { onRetry?: () => void }
): void {
	const now = Date.now();
	const lastShownAt = recentToasts.get(message);
	if (lastShownAt !== undefined && now - lastShownAt < DEDUP_WINDOW_MS) {
		return;
	}
	recentToasts.set(message, now);

	const onRetry = options?.onRetry;
	toast.error(message, {
		action: onRetry ? { label: "Retry", onClick: onRetry } : undefined,
	});
}
