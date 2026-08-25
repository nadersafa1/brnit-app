import { describe, expect, it } from "bun:test";

import { cn } from "./utils";

describe("cn", () => {
	it("joins_plain_class_names", () => {
		expect(cn("flex", "items-center")).toBe("flex items-center");
	});

	it.each([
		["undefined", undefined],
		["null", null],
		["false", false],
		["empty string", ""],
	])("drops_%s_entries", (_case, input) => {
		expect(cn("flex", input, "gap-2")).toBe("flex gap-2");
	});

	it("keeps_the_last_class_when_two_conflict", () => {
		expect(cn("rounded-none", "rounded-full")).toBe("rounded-full");
	});

	it("lets_a_caller_override_a_component_default", () => {
		expect(cn("h-11 rounded-full px-4.5", "h-9 rounded-lg")).toBe(
			"px-4.5 h-9 rounded-lg"
		);
	});

	it("does_not_merge_classes_from_different_groups", () => {
		expect(cn("bg-card", "text-card-foreground")).toBe(
			"bg-card text-card-foreground"
		);
	});

	it("resolves_conflicts_inside_a_variant_prefix", () => {
		expect(cn("hover:bg-accent", "hover:bg-primary")).toBe("hover:bg-primary");
	});

	it("flattens_arrays_and_conditional_objects", () => {
		expect(cn(["flex", ["gap-2"]], { "opacity-50": true, hidden: false })).toBe(
			"flex gap-2 opacity-50"
		);
	});
});
