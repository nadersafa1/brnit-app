import { and, type SQL } from "drizzle-orm";

/**
 * Drizzle query helpers.
 *
 * This module imports `drizzle-orm`, so it is server-only. The web and native
 * apps must never import it — they take types and zod schemas from `@brnit/api`
 * and its client-safe subpaths instead.
 */

/**
 * ANDs together the conditions that are actually present, dropping `undefined`
 * entries so callers can build filter lists with inline conditionals:
 *
 * ```ts
 * combineConditions([
 *   search ? ilike(table.name, `%${search}%`) : undefined,
 *   categoryId ? eq(table.categoryId, categoryId) : undefined,
 * ])
 * ```
 *
 * Returns `undefined` when nothing survives, which Drizzle reads as "no
 * `WHERE` clause".
 */
export function combineConditions(
	conditions: (SQL<unknown> | undefined)[]
): SQL<unknown> | undefined {
	const present = conditions.filter(
		(condition): condition is SQL<unknown> => condition !== undefined
	);

	if (present.length === 0) {
		return;
	}

	return present.reduce<SQL<unknown> | undefined>(
		(accumulated, condition) =>
			accumulated ? and(accumulated, condition) : condition,
		undefined
	);
}
