import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";

import { logger } from "./logger";

interface RequestStore {
	log: Logger;
	requestId: string;
}

/**
 * Holds the per-request child logger for the current async execution chain.
 * Populated by `requestContextMiddleware` after `pino-http` attaches `req.log`.
 *
 * Defined at module scope so the same store instance is shared across every
 * workspace package that imports `@brnit/logger` — `apps/server` populates
 * the store at the request boundary and `packages/api` reads it through
 * `getLogger()`.
 */
export const requestContext = new AsyncLocalStorage<RequestStore>();

/**
 * Returns the request-scoped logger when inside an HTTP handler, otherwise the
 * root logger (e.g. startup, workers, or background jobs without a request).
 */
export function getLogger(): Logger {
	return requestContext.getStore()?.log ?? logger;
}
