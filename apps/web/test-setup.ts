/**
 * Web-only test preload, named by this app's `test` script alongside the shared
 * `../../test-setup.ts` (the repo convention — `[test] preload` in the root
 * `bunfig.toml` resolves against the working directory, and turbo runs each
 * task inside its own package, so it never applies here).
 *
 * The shared file covers the server env and pins `TZ=UTC`. This one adds what
 * only the web app needs: `@brnit/env/web` validates on first import and throws
 * when a `VITE_*` var is missing. Vite normally inlines those at build time;
 * under `bun test` there is no Vite, so anything importing `lib/api/client.ts`
 * — which is every query module — would fail to load. Bun exposes `process.env`
 * as `import.meta.env`, so setting placeholders here is enough.
 *
 * `??=` so a real `.env` or a CI value still wins. These are placeholders, never
 * real endpoints: no test in this app makes a network request, and a reachable
 * URL here would be an invitation to start.
 */
process.env.VITE_SERVER_URL ??= "http://127.0.0.1:3000";
process.env.VITE_API_VERSION ??= "1";
