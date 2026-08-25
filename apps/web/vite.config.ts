import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `tanstackRouter()` must run **before** `react()` so the generated
 * `routeTree.gen.ts` exists before the React plugin transforms it.
 *
 * `apps/web/legacy/**` holds the pre-overhaul Next.js screens, kept only as
 * source material for the remaining page migrations. Nothing imports it, so
 * Vite never bundles it; `src/index.css` also tells Tailwind not to scan it.
 */
export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		port: 3001,
	},
});
