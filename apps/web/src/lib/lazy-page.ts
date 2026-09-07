import { type ComponentType, type LazyExoticComponent, lazy } from "react";

import {
	isChunkLoadError,
	reloadOnceOnChunkLoadError,
} from "./chunk-load-recovery";

/** Dynamic export lookup — page modules expose components with different prop shapes. */
// biome-ignore lint/suspicious/noExplicitAny: lazy-loaded modules expose heterogeneous component props
type PageModule = Record<string, ComponentType<any> | undefined>;

async function importPageModule<P>(
	importer: () => Promise<PageModule>,
	exportName: string
): Promise<{ default: ComponentType<P> }> {
	try {
		const module = await importer();
		const Component = module[exportName];
		if (!Component) {
			throw new Error(
				`Page export "${exportName}" was not found. Try refreshing the app.`
			);
		}
		return { default: Component as ComponentType<P> };
	} catch (error) {
		if (isChunkLoadError(error) && reloadOnceOnChunkLoadError()) {
			// Never settles: the page is being replaced by the reload.
			return new Promise(() => {
				// Intentionally empty.
			});
		}
		throw error;
	}
}

/**
 * `React.lazy` for a **named** page export, with stale-deploy recovery.
 *
 * Pages are named exports rather than defaults so the symbol is greppable and
 * the route file reads as documentation of what it renders.
 */
export function lazyPage<P = Record<string, never>>(
	importer: () => Promise<PageModule>,
	exportName: string
): LazyExoticComponent<ComponentType<P>> {
	return lazy(() => importPageModule<P>(importer, exportName));
}
