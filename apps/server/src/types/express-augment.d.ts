import type { Logger } from "pino";

import type { RequestAuth } from "./request-auth.js";

declare global {
	// biome-ignore lint/style/noNamespace: Express `Request` augmentation requires the `Express` namespace
	namespace Express {
		interface Request {
			/**
			 * Better Auth session plus whatever organization scope the guard that
			 * ran resolved. See `middlewares/auth-middleware.ts`.
			 */
			auth?: RequestAuth;
			/** Correlation id assigned by `pinoHttpLogger` (`genReqId`). */
			id: string;
			/** Request-scoped child logger assigned by `pinoHttpLogger`. */
			log: Logger;
		}
	}
}
