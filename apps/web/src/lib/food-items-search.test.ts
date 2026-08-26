import { describe, expect, it } from "bun:test";

import { parseFoodItemsSearch } from "./food-items-search";

/** `validateSearch` is handed the raw, unvalidated query object. */
function parse(search: Record<string, unknown>) {
	return parseFoodItemsSearch(
		search as Parameters<typeof parseFoodItemsSearch>[0]
	);
}

describe("parseFoodItemsSearch", () => {
	it("defaults every field for an empty query", () => {
		expect(parse({})).toEqual({
			categoryId: "",
			page: 1,
			perPage: 25,
			q: "",
			sortBy: "createdAt",
			sortOrder: "desc",
		});
	});

	it("keeps valid values", () => {
		expect(
			parse({
				categoryId: "b6f2c0f4-0000-4000-8000-000000000000",
				page: 3,
				perPage: 50,
				q: "chicken",
				sortBy: "protein",
				sortOrder: "asc",
			})
		).toEqual({
			categoryId: "b6f2c0f4-0000-4000-8000-000000000000",
			page: 3,
			perPage: 50,
			q: "chicken",
			sortBy: "protein",
			sortOrder: "asc",
		});
	});

	it("falls back rather than erroring on a malformed page", () => {
		expect(parse({ page: "abc" }).page).toBe(1);
		expect(parse({ page: 0 }).page).toBe(1);
		expect(parse({ page: -2 }).page).toBe(1);
		expect(parse({ page: 1.5 }).page).toBe(1);
	});

	it("coerces a page size the table does not offer back to the default", () => {
		expect(parse({ perPage: 7 }).perPage).toBe(25);
		expect(parse({ perPage: 1000 }).perPage).toBe(25);
		expect(parse({ perPage: 100 }).perPage).toBe(100);
	});

	it("rejects an unknown sort column and direction", () => {
		expect(parse({ sortBy: "sugar" }).sortBy).toBe("createdAt");
		expect(parse({ sortOrder: "sideways" }).sortOrder).toBe("desc");
	});

	it("truncates an over-long search to what the server accepts", () => {
		expect(parse({ q: "a".repeat(250) }).q).toHaveLength(100);
	});
});
