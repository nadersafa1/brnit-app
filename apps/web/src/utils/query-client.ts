import { onlineManager, QueryCache, QueryClient } from "@tanstack/react-query";

import { getUserFacingErrorMessage } from "@/lib/get-error-message";
import { showDedupedErrorToast } from "@/utils/query-error-toast";
import { shouldRetryQuery } from "@/utils/query-retry";

const DEFAULT_ERROR_MESSAGE = "Something went wrong.";

/**
 * The single query client, created at module scope and handed to the router as
 * context so loaders can prefetch into the same cache the components read.
 *
 * The global error toast is **opt-in** per query (`meta.showErrorToast`, typed
 * in `src/types/react-query.d.ts`): a screen that renders its own inline error
 * state must not also fire a toast. It is suppressed entirely while offline,
 * where `<OfflineBanner/>` is already telling the user what is wrong.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: shouldRetryQuery,
			staleTime: 30_000,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (!query.meta?.showErrorToast) {
				return;
			}
			if (!onlineManager.isOnline()) {
				return;
			}
			showDedupedErrorToast(
				getUserFacingErrorMessage(error, DEFAULT_ERROR_MESSAGE),
				{
					onRetry: () => {
						query.invalidate();
					},
				}
			);
		},
	}),
});
