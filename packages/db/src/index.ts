import { env } from "@brnit/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: drizzle needs the whole schema object to build db.query
import * as schema from "./schema";

/**
 * Drizzle client bound to the full schema, so `db.query.*` relational reads work.
 *
 * Two entry points, deliberately:
 * - {@link db} (also the default export) is the process-wide singleton every
 *   handler and service should import. One connection pool per process.
 * - {@link createDbClient} builds an isolated client with its own pool. Used by
 *   `@brnit/auth` (which must not inherit request-scoped state) and by tests
 *   that need to point at a throwaway database.
 */
export function createDbClient(connectionString: string = env.DATABASE_URL) {
	return drizzle(connectionString, { schema });
}

/** Type of the shared client; use for `tx` / repository parameters. */
export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Transaction handle passed to `db.transaction(async (tx) => …)` callbacks.
 * `recomputeMealTotals(tx, mealId)` and friends take this, never the singleton,
 * so denormalized `meal.total_*` writes stay inside the caller's transaction.
 */
export type DbTransaction = Parameters<
	Parameters<DbClient["transaction"]>[0]
>[0];

export const db = createDbClient();

export default db;
