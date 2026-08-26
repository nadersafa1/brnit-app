import { existsSync } from "node:fs";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Paths are relative to the package directory, which is drizzle-kit's cwd when
 * invoked through `turbo -F @brnit/db …` or `bun run --cwd packages/db …`.
 *
 * The API moved from `apps/web` (Next.js route handlers) to the standalone
 * `apps/server` Express app, so that is where `DATABASE_URL` now lives. The repo
 * root `.env` is the fallback for compose / CI shells that keep a single env
 * file. Neither file is required — in a deploy the variable comes from the real
 * environment and there is simply nothing for dotenv to load.
 */
const ENV_CANDIDATES = ["../../apps/server/.env", "../../.env"];

const envPath = ENV_CANDIDATES.find((candidate) => existsSync(candidate));
if (envPath) {
	dotenv.config({ path: envPath });
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "",
	},
});
