import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { RouterDefaultError } from "./components/router-default-error";
import { registerChunkLoadRecovery } from "./lib/chunk-load-recovery";
import { routeTree } from "./routeTree.gen";
import { initNetworkManager } from "./stores/network-store";
import { queryClient } from "./utils/query-client";

// The theme is applied by the blocking script in `index.html`, before this
// module is even fetched — doing it here would flash the wrong palette.
initNetworkManager();
registerChunkLoadRecovery();

const router = createRouter({
	context: { queryClient },
	defaultErrorComponent: RouterDefaultError,
	defaultPendingComponent: () => <Loader />,
	defaultPreload: "intent",
	routeTree,
	// `Wrap` puts the provider *outside* the router, so route loaders and
	// `beforeLoad` guards share the one query client the components read.
	Wrap({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

// Guarded so an HMR re-execution of this module does not mount a second root.
if (!rootElement.innerHTML) {
	ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />);
}
