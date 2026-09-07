import { Button } from "@brnit/ui/components/button";
import { useRouter } from "@tanstack/react-router";

import Loader from "@/components/loader";
import {
	isChunkLoadError,
	reloadOnceOnChunkLoadError,
} from "@/lib/chunk-load-recovery";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

interface RouterDefaultErrorProps {
	error: unknown;
	reset?: () => void;
}

const FALLBACK_MESSAGE = "Something went wrong.";

/**
 * The router's `defaultErrorComponent`.
 *
 * A stale-deploy chunk failure is not a user-facing error — it is swallowed and
 * the page reloads once, so the visitor sees a loader rather than an alert for
 * something a refresh fixes. Everything else renders as `role="alert"` with a
 * retry that both resets the boundary and re-runs the route's loaders.
 */
export function RouterDefaultError({
	error,
	reset,
}: Readonly<RouterDefaultErrorProps>) {
	const router = useRouter();

	if (isChunkLoadError(error) && reloadOnceOnChunkLoadError()) {
		return <Loader />;
	}

	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
			<p className="font-semibold text-lg">Something went wrong</p>
			<p className="max-w-lg text-destructive text-sm" role="alert">
				{getUserFacingErrorMessage(error, FALLBACK_MESSAGE)}
			</p>
			<Button
				onClick={() => {
					reset?.();
					router.invalidate();
				}}
				size="sm"
				variant="outline"
			>
				Try again
			</Button>
		</div>
	);
}
