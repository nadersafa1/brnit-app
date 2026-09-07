import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Vite inlines `import.meta.env.VITE_*` at build time, so these must be present
 * when `vite build` runs (see the `ARG VITE_*` block in `Dockerfile.web`) — not
 * only in the runtime container.
 */
export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		/** Origin of the Express API the SPA talks to (e.g. `https://api.brnit.app`). */
		VITE_SERVER_URL: z.url(),
		/** API major version mounted at `/api/v{n}`. */
		VITE_API_VERSION: z.coerce.number().int().min(1).default(1),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
