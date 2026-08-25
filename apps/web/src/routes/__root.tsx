import { Toaster } from "@brnit/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";

import { OfflineBanner } from "@/components/offline-banner";
import { THEME_STORAGE_KEY, ThemeProvider } from "@/components/theme-provider";
import { createRootPageHead } from "@/lib/page-head";

import "../index.css";

/** Router context, so `loader`s and `beforeLoad` guards can reach the cache. */
export interface RouterAppContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: createRootPageHead,
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			{/*
			 * `attribute="class"` is what `brand.css` scopes its dark palette on.
			 * `storageKey` must match the blocking script in `index.html`, and
			 * `enableSystem` must match its `prefers-color-scheme` branch.
			 */}
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				enableColorScheme
				enableSystem
				storageKey={THEME_STORAGE_KEY}
				themes={["light", "dark"]}
			>
				<OfflineBanner />
				<Outlet />
				<Toaster position="top-right" richColors />
			</ThemeProvider>
		</>
	);
}
