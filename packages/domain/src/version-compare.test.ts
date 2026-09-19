import { describe, expect, it } from "bun:test";

import { isVersionBelow } from "./version-compare";

describe("isVersionBelow", () => {
	it("orders by major first", () => {
		expect(isVersionBelow("1.0.0", "2.0.0")).toBe(true);
		expect(isVersionBelow("2.0.0", "1.0.0")).toBe(false);
	});

	it("falls through to minor when majors match", () => {
		expect(isVersionBelow("1.0.0", "1.1.0")).toBe(true);
		expect(isVersionBelow("1.1.0", "1.0.0")).toBe(false);
	});

	it("falls through to patch when major and minor match", () => {
		expect(isVersionBelow("1.0.0", "1.0.1")).toBe(true);
		expect(isVersionBelow("1.0.1", "1.0.0")).toBe(false);
	});

	it("does not treat a lower minor as decisive against a higher major", () => {
		expect(isVersionBelow("2.0.0", "1.9.9")).toBe(false);
		expect(isVersionBelow("1.9.9", "2.0.0")).toBe(true);
	});

	it("is strict: an equal version is not below", () => {
		expect(isVersionBelow("1.0.0", "1.0.0")).toBe(false);
		expect(isVersionBelow("3.14.15", "3.14.15")).toBe(false);
	});

	it("pads missing segments with zero", () => {
		expect(isVersionBelow("1", "2")).toBe(true);
		expect(isVersionBelow("2", "1")).toBe(false);
		// "1" is exactly 1.0.0, so neither direction is below.
		expect(isVersionBelow("1", "1.0.0")).toBe(false);
		expect(isVersionBelow("1.0.0", "1")).toBe(false);
		expect(isVersionBelow("1.2", "1.2.1")).toBe(true);
	});

	it("truncates to three segments, ignoring a fourth", () => {
		expect(isVersionBelow("1.2.3.4", "1.2.3")).toBe(false);
		expect(isVersionBelow("1.2.3", "1.2.3.4")).toBe(false);
		// The 4th segment cannot rescue a lower patch.
		expect(isVersionBelow("1.2.3.99", "1.2.4")).toBe(true);
	});

	it("reads a non-numeric segment as zero", () => {
		expect(isVersionBelow("1.2.0-beta", "1.2.0")).toBe(false);
		expect(isVersionBelow("1.2.0", "1.2.0-beta")).toBe(false);
		// "3-beta" is not 3 — it is 0, so a pre-release sorts below its release.
		expect(isVersionBelow("1.2.3-beta", "1.2.3")).toBe(true);
		expect(isVersionBelow("not-a-version", "0.0.1")).toBe(true);
	});

	it("treats an empty current version as 0.0.0, below every release", () => {
		expect(isVersionBelow("", "1.0.0")).toBe(true);
		expect(isVersionBelow("", "0.0.1")).toBe(true);
	});

	it("treats an empty threshold as 0.0.0, which nothing is below", () => {
		expect(isVersionBelow("1.0.0", "")).toBe(false);
		expect(isVersionBelow("0.0.0", "")).toBe(false);
		expect(isVersionBelow("", "")).toBe(false);
	});
});
