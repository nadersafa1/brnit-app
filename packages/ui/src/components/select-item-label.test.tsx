import { describe, expect, it } from "bun:test";

import { getTextFromSelectItemChildren } from "./select-item-label";

describe("getTextFromSelectItemChildren", () => {
	it.each([
		["plain string", "Grilled chicken", "Grilled chicken"],
		["number", 420, "420"],
		["null", null, undefined],
		["undefined", undefined, undefined],
		["false", false, undefined],
		["empty string", "", undefined],
	])("returns_expected_text_for_%s", (_case, input, expected) => {
		expect(getTextFromSelectItemChildren(input)).toBe(expected);
	});

	it("joins_nested_fragment_children", () => {
		expect(
			getTextFromSelectItemChildren(
				<>
					Grilled chicken · <span>165 kcal</span>
				</>
			)
		).toBe("Grilled chicken · 165 kcal");
	});

	it("unwraps_a_single_nested_element", () => {
		expect(
			getTextFromSelectItemChildren(
				<span>
					<strong>Oats</strong>
				</span>
			)
		).toBe("Oats");
	});

	it("skips_elements_that_render_no_text", () => {
		expect(
			getTextFromSelectItemChildren(
				<>
					<span />
					Almonds
				</>
			)
		).toBe("Almonds");
	});
});
