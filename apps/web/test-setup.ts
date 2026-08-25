/**
 * Test preload for `apps/web`, wired via `[test] preload` in this app's
 * `bunfig.toml`.
 *
 * `@brnit/env/web` validates on first import and throws when a `VITE_*` var is
 * missing. Vite normally inlines those at build time; under `bun test` there is
 * no Vite, so anything importing `lib/api/client.ts` — every query module —
 * would fail to load. Bun exposes `process.env` as `import.meta.env`, so
 * setting placeholders here is enough.
 *
 * These are placeholders, never real endpoints: no test in this app makes a
 * network request, and a real URL here would be an invitation to start.
 */
process.env.VITE_SERVER_URL ??= "http://localhost:3000";
process.env.VITE_API_VERSION ??= "1";
