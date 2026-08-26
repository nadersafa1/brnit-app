import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		// Built as a standalone file so it can be passed to `bun --preload`,
		// which guarantees the OTel SDK starts before any entrypoint chunk
		// (and therefore before express/pino/pg/...) loads. docker-compose.yml
		// runs both the api and worker services that way.
		"./src/instrumentation.ts",
		"./src/index.ts",
		"./src/worker-background.ts",
	],
	format: "esm",
	outDir: "./dist",
	clean: true,
	noExternal: [/@brnit\/.*/],
	// Keep Cloudinary in node_modules so `cloudinary.url()` can read its package.json (sdk_semver).
	external: ["cloudinary"],
});
