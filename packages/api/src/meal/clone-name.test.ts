import { describe, expect, it } from "bun:test";

import {
	buildClonedMealName,
	MEAL_CLONE_NAME_SUFFIX,
	MEAL_NAME_MAX_LENGTH,
} from "./clone-name";

/** Longest base that still fits once the suffix is appended. */
const LONGEST_UNTRUNCATED_BASE =
	MEAL_NAME_MAX_LENGTH - MEAL_CLONE_NAME_SUFFIX.length;

describe("buildClonedMealName", () => {
	it("appends the suffix to a short name", () => {
		expect(buildClonedMealName("Chicken bowl")).toBe("Chicken bowl clone");
	});

	it("keeps a one-character name intact", () => {
		expect(buildClonedMealName("a")).toBe("a clone");
	});

	it("leaves the base untouched at the last length that still fits", () => {
		const base = "x".repeat(LONGEST_UNTRUNCATED_BASE);
		const cloned = buildClonedMealName(base);

		expect(cloned).toBe(`${base}${MEAL_CLONE_NAME_SUFFIX}`);
		expect(cloned).toHaveLength(MEAL_NAME_MAX_LENGTH);
	});

	it("truncates the base by one at the first length that overflows", () => {
		const base = "x".repeat(LONGEST_UNTRUNCATED_BASE + 1);
		const cloned = buildClonedMealName(base);

		expect(cloned).toHaveLength(MEAL_NAME_MAX_LENGTH);
		expect(cloned).toBe(
			`${"x".repeat(LONGEST_UNTRUNCATED_BASE)}${MEAL_CLONE_NAME_SUFFIX}`
		);
	});

	it("truncates a name already at the column limit", () => {
		const base = "x".repeat(MEAL_NAME_MAX_LENGTH);
		const cloned = buildClonedMealName(base);

		expect(cloned).toHaveLength(MEAL_NAME_MAX_LENGTH);
		expect(cloned.endsWith(MEAL_CLONE_NAME_SUFFIX)).toBe(true);
	});

	it("never lets the clone exceed the limit, however long the source", () => {
		for (const length of [
			LONGEST_UNTRUNCATED_BASE - 1,
			LONGEST_UNTRUNCATED_BASE,
			LONGEST_UNTRUNCATED_BASE + 1,
			MEAL_NAME_MAX_LENGTH,
			MEAL_NAME_MAX_LENGTH * 4,
		]) {
			const cloned = buildClonedMealName("y".repeat(length));

			expect(cloned.length).toBeLessThanOrEqual(MEAL_NAME_MAX_LENGTH);
			expect(cloned.endsWith(MEAL_CLONE_NAME_SUFFIX)).toBe(true);
		}
	});

	it("always keeps at least one character of the base", () => {
		const cloned = buildClonedMealName("z".repeat(MEAL_NAME_MAX_LENGTH * 2));

		expect(cloned.slice(0, -MEAL_CLONE_NAME_SUFFIX.length).length).toBeGreaterThan(
			0
		);
	});
});
