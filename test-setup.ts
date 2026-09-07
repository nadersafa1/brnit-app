/**
 * Test preload, wired via `[test] preload` in `bunfig.toml`.
 *
 * ## Run tests per workspace, not across the whole repo
 *
 * Use `bun run test` — at the root that is `turbo test`, one process per
 * workspace; inside a package it is that package's own script. Do NOT run
 * `bun test packages/ apps/` in one command: `mock.module` is process-wide and
 * permanent, so the server's route tests — which mock `@brnit/auth` and
 * `@brnit/api` wholesale — leak into the handler tests that run after them and
 * make ~14 of them fail. Each suite passes in isolation; the failures are an
 * artifact of sharing a process, not of the code.
 *
 * ## Why every workspace passes `--preload ../../test-setup.ts`
 *
 * `[test] preload` in the root `bunfig.toml` resolves relative to the working
 * directory, and turbo runs each task with the cwd inside its own package — so
 * the root config is simply not seen, and bare `bun test` from inside a package
 * silently loses these placeholders. Rather than duplicating a bunfig per
 * workspace, each `test` script names this file explicitly. Every workspace is
 * exactly two levels deep, so the relative path is uniform.
 *
 * `@brnit/env/server` validates and freezes `process.env` the first time it is
 * imported, and `bun test` shares one process across every test file. Setting
 * placeholders inside an individual test file therefore only works when that
 * file happens to load the env module first — run the whole suite and whichever
 * file got there first decides what every other file sees.
 *
 * Preloading fixes the ordering: these are set before any test module is
 * evaluated, so the env is identical whether you run one file or all of them.
 *
 * `??=` throughout, so a real `.env` or a CI secret still wins.
 *
 * None of these are real credentials and nothing here reaches the network —
 * every test that would touch Postgres, Cloudinary or Redis mocks its client.
 */

// Core — required by `@brnit/env/server`, so the module graph cannot load
// without them.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";
process.env.NODE_ENV ??= "test";

// Cloudinary — only the cloud name is needed to build asset URLs, which the
// assessment and food DTOs do whenever a row carries an image. Key and secret
// are upload-only and stay unset, so a test that accidentally tries to upload
// fails loudly rather than reaching the network.
process.env.CLOUDINARY_CLOUD_NAME ??= "test-cloud";

// Deterministic windows. The consumption guards and the alternatives filter
// read these at module load and memoize, so pinning them keeps boundary tests
// from depending on whatever the ambient environment happens to set.
process.env.MAX_CONSUMPTION_PAST_DAYS ??= "2";
process.env.DIET_PLAN_CONSUMPTION_GRACE_DAYS ??= "2";
process.env.ALTERNATIVES_TOLERANCE_CAL_PCT ??= "15";
process.env.ALTERNATIVES_TOLERANCE_PROTEIN_PCT ??= "15";
process.env.ALTERNATIVES_TOLERANCE_CARBS_PCT ??= "15";
process.env.ALTERNATIVES_TOLERANCE_FAT_PCT ??= "15";

// Audit writes are asserted explicitly where they matter; leaving this off by
// default keeps every other test from attempting an insert.
process.env.AUDIT_LOG_DB_ENABLED ??= "false";

// Timezone. The server pins UTC in `apps/server/src/index.ts`, and the date
// helpers are UTC-only — without this a developer machine on a non-UTC clock
// gets different results from CI.
process.env.TZ ??= "UTC";
