import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `tanstackRouter()` must run **before** `react()` so `routeTree.gen.ts` exists
 * before the React plugin transforms it.

 */
export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: [
			{
				find: "@",
				replacement: path.resolve(import.meta.dirname, "./src"),
			},
		],
	},
	server: {
		port: 3001,
	},
});
