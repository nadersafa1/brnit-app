import { useEffect } from "react";
import { showError } from "@/lib/feedback";

/**
 * Surfaces query errors as toasts. Used when inline error UI may be off-screen
 * (e.g. long home scroll) so failures are still noticeable.
 */
export function useSurfaceQueryErrorToast(error: Error | null | undefined) {
	useEffect(() => {
		if (error) {
			showError(error.message);
		}
	}, [error]);
}
