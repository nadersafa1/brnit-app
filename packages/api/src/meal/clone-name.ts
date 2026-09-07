/**
 * Naming rule for `POST /meals/:id/clone`.
 *
 * Deliberately dependency-free so the boundary behaviour stays trivially
 * testable — the 255-character limit is the `meal.name` contract enforced by
 * `createMealInputSchema`, and a clone that silently exceeded it would be
 * rejected on the next edit rather than at creation time.
 */

/** Max length of `meal.name`, matching `createMealInputSchema`. */
export const MEAL_NAME_MAX_LENGTH = 255;

/** Appended to the source name. The leading space is part of the suffix. */
export const MEAL_CLONE_NAME_SUFFIX = " clone";

/**
 * `"{name} clone"`, truncating the base so the result never exceeds
 * {@link MEAL_NAME_MAX_LENGTH}.
 *
 * The base is kept at **at least one character** even in the degenerate case
 * where the suffix alone would fill the budget, so a clone is never named by
 * the suffix on its own.
 */
export function buildClonedMealName(originalName: string): string {
	const candidate = `${originalName}${MEAL_CLONE_NAME_SUFFIX}`;
	if (candidate.length <= MEAL_NAME_MAX_LENGTH) {
		return candidate;
	}
	const maxBaseLength = MEAL_NAME_MAX_LENGTH - MEAL_CLONE_NAME_SUFFIX.length;
	const base = originalName.slice(0, Math.max(1, maxBaseLength));
	return `${base}${MEAL_CLONE_NAME_SUFFIX}`;
}
