/**
 * Route and middleware tests import modules that validate `@brnit/env/server`
 * at load time. Set placeholders so a shell with no `.env` can still run
 * `bun test`. Real values are never needed — every dependency is mocked.
 */
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";
