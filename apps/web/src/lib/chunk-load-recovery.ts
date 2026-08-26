const CHUNK_RELOAD_SESSION_KEY = "brnit-web-chunk-reload-v1";

/**
 * A stale deploy is the common cause: the browser holds an `index.html` whose
 * hashed chunk names no longer exist on the server, so the next lazy route
 * fails to import. Matching on the message is the only signal available —
 * neither Vite nor the browser gives these a distinguishable error type.
 */
export function isChunkLoadError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const message = error.message.toLowerCase();
	return (
		message.includes("failed to fetch dynamically imported module") ||
		message.includes("importing a module script failed") ||
		message.includes("error loading dynamically imported module") ||
		message.includes("unable to preload css")
	);
}

/**
 * Reloads once, then gives up — the sessionStorage flag stops a genuinely
 * broken build from putting the tab in a reload loop.
 *
 * Returns whether a reload was started, so callers can render a loader instead
 * of an error while the page goes away.
 */
export function reloadOnceOnChunkLoadError(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)) {
		sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
		return false;
	}

	sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, "1");
	window.location.reload();
	return true;
}

export function registerChunkLoadRecovery(): void {
	if (typeof window === "undefined") {
		return;
	}

	window.addEventListener("vite:preloadError", (event) => {
		// Only suppress Vite's throw when a reload is actually happening.
		// Otherwise __vitePreload's catch resolves `undefined` and the lazy route
		// crashes with "Cannot read properties of undefined".
		if (reloadOnceOnChunkLoadError()) {
			event.preventDefault();
		}
	});
}
