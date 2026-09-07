import { describe, expect, it } from "bun:test";

import {
	FIELD_CONTROL_BASE,
	fieldControlVariants,
} from "./field-control-variants";

const SIZES = ["sm", "default", "lg"] as const;

describe("fieldControlVariants", () => {
	it("defaults_to_the_44px_pill_from_design_json", () => {
		const resolved = fieldControlVariants();
		expect(resolved).toContain("h-11");
		expect(resolved).toContain("rounded-full");
	});

	it("resolves_each_size_to_its_own_height", () => {
		expect(fieldControlVariants({ size: "sm" })).toContain("h-9");
		expect(fieldControlVariants({ size: "default" })).toContain("h-11");
		expect(fieldControlVariants({ size: "lg" })).toContain("h-12");
	});

	it("never_drops_below_the_36px_minimum_step", () => {
		const heights = SIZES.map((size) => {
			const match = /\bh-(\d+)\b/.exec(fieldControlVariants({ size }));
			return Number(match?.[1] ?? 0);
		});
		expect(Math.min(...heights)).toBeGreaterThanOrEqual(9);
	});

	it("swaps_the_pill_radius_for_a_block_radius", () => {
		const resolved = fieldControlVariants({ shape: "block" });
		expect(resolved).toContain("rounded-lg");
		expect(resolved).not.toContain("rounded-full");
	});

	it("keeps_the_invalid_ring_in_every_size", () => {
		for (const size of SIZES) {
			expect(fieldControlVariants({ size })).toContain(
				"aria-invalid:ring-destructive/40"
			);
		}
	});

	it("keeps_the_focus_ring_and_the_borderless_card_surface", () => {
		expect(FIELD_CONTROL_BASE).toContain("focus-visible:ring-ring");
		expect(FIELD_CONTROL_BASE).toContain("bg-card");
		expect(FIELD_CONTROL_BASE).toContain("shadow-soft");
		// design.json shape.stroke.default is "none" — controls are never bordered.
		expect(FIELD_CONTROL_BASE).not.toContain("border");
	});

	it("appends_a_caller_class_after_the_variant_classes", () => {
		expect(fieldControlVariants({ className: "w-40" })).toEndWith("w-40");
	});
});
