import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "../..");

/**
 * `tanstackRouter()` must run **before** `react()` so `routeTree.gen.ts` exists
 * before the React plugin transforms it.
 *
 * `apps/web/legacy/**` holds the pre-overhaul Next.js screens, kept only as
 * source material for the remaining page migrations. Nothing imports it, so
 * Vite never bundles it; `src/index.css` also tells Tailwind not to scan it.
 */
export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: [
			{
				find: "@",
				replacement: path.resolve(import.meta.dirname, "./src"),
			},
			// WORKAROUND — remove once `packages/api/package.json` is fixed.
			//
			// That manifest exposes nested subpaths through a two-wildcard exports
			// pattern. Node resolves it, and so does `tsc`, but Rollup follows the
			// spec strictly — an exports pattern may contain at most one wildcard —
			// so `@brnit/api/food/schemas` fails to resolve at build time while
			// type-checking clean. Only the two-segment paths listed explicitly in
			// that manifest (`./organization/context`, `./pagination/offset`,
			// `./pagination/query-params`) work without this.
			//
			// The fix belongs in `packages/api/package.json`: list the nested
			// subpaths explicitly, or use a single wildcard whose target has no
			// `.ts` suffix so one pattern covers nested paths. Until then this maps
			// every `@brnit/api/<area>/<module>` onto its source file, which is
			// exactly what the exports map intends.
			{
				find: /^@brnit\/api\/(.+)$/,
				replacement: path.join(repoRoot, "packages/api/src/$1.ts"),
			},
		],
	},
	server: {
		port: 3001,
	},
});
