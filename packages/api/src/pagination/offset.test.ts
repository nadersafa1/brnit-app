import { describe, expect, it } from "bun:test";

import {
	calculateOffset,
	createPaginatedResponse,
	DEFAULT_PER_PAGE,
	MAX_PER_PAGE,
} from "./offset";

describe("calculateOffset", () => {
	it("returns 0 for the first page", () => {
		expect(calculateOffset(1, 25)).toBe(0);
	});

	it("skips a full page per preceding page", () => {
		expect(calculateOffset(2, 25)).toBe(25);
		expect(calculateOffset(4, 10)).toBe(30);
	});
});

describe("createPaginatedResponse", () => {
	it("wraps items under the data key with pagination meta", () => {
		const response = createPaginatedResponse([{ id: "a" }], 1, 25, 1);

		expect(response.data).toEqual([{ id: "a" }]);
		expect(response.pagination).toEqual({
			page: 1,
			perPage: 25,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it("rounds totalPages up on a partial last page", () => {
		expect(createPaginatedResponse([], 1, 25, 51).pagination.totalPages).toBe(3);
	});

	it("reports zero pages when there are no items", () => {
		expect(createPaginatedResponse([], 1, 25, 0).pagination.totalPages).toBe(0);
	});

	it("supports a custom data key", () => {
		const response = createPaginatedResponse(["x"], 1, 10, 1, {
			dataKey: "items",
		});

		expect(response.items).toEqual(["x"]);
	});

	it("does not divide by zero when perPage is zero", () => {
		expect(createPaginatedResponse([], 1, 0, 5).pagination.totalPages).toBe(0);
	});
});

describe("pagination constants", () => {
	it("keeps the default within the allowed range", () => {
		expect(DEFAULT_PER_PAGE).toBeGreaterThanOrEqual(1);
		expect(DEFAULT_PER_PAGE).toBeLessThanOrEqual(MAX_PER_PAGE);
	});
});
