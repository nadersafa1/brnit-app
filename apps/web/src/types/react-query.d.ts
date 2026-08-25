import "@tanstack/react-query";

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: {
			/** When true, a failed query surfaces the global Sonner toast (opt-in). */
			showErrorToast?: boolean;
		};
	}
}
