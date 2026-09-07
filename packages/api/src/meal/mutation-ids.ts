/**
 * Pure set arithmetic shared by the `add` / `remove` / `update` patch payloads
 * on `PATCH /meals/:id` and `PATCH /diet-plans/:id`.
 *
 * Both endpoints run the same three checks before touching the database:
 * reject ids that appear in **both** `remove` and `update`, reject ids that do
 * not belong to the parent row, and dedupe the foreign keys being added. The
 * arithmetic is identical, so it lives here once; only the error wording
 * differs, and that stays in each domain's `conflicts.ts`.
 *
 * Dependency-free on purpose — the diet-plan handlers import it from here.
 */

/**
 * Ids present in `remove` *and* in `update`, in `update` order.
 *
 * An id in both lists is ambiguous rather than merely redundant: the mutation
 * order deletes before it patches, so the patch would silently target a row
 * that no longer exists. Callers reject the request instead.
 */
export function findRemoveUpdateConflicts(
	remove: readonly string[] | undefined,
	updateIds: readonly string[]
): string[] {
	if (!remove?.length) {
		return [];
	}
	const removeSet = new Set(remove);
	return updateIds.filter((id) => removeSet.has(id));
}

/** Requested ids with no matching row, preserving request order. */
export function findMissingIds(
	requested: readonly string[],
	existing: readonly string[]
): string[] {
	const existingSet = new Set(existing);
	return requested.filter((id) => !existingSet.has(id));
}

/** Deduped ids in first-seen order. */
export function uniqueIds(values: readonly string[]): string[] {
	return [...new Set(values)];
}
