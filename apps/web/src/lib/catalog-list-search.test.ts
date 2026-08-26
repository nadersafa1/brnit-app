import { describe, expect, it } from "bun:test";

import { parseCatalogListSearch } from "./catalog-list-search";

/** `validateSearch` is handed the raw, unvalidated query object. */
function parse(search: Record<string, unknown>) {
	return parseCatalogListSearch(
		search as Parameters<typeof parseCatalogListSearch>[0]
	);
}

describe("parseCatalogListSearch", () => {
	it("opens alphabetically when the query is empty", () => {
		expect(parse({})).toEqual({
			page: 1,
			perPage: 25,
			q: "",
			sortBy: "name",
			sortOrder: "asc",
		});
	});

	it("keeps valid values", () => {
		expect(
			parse({
				page: 4,
				perPage: 50,
				q: "bowl",
				sortBy: "createdAt",
				sortOrder: "desc",
			})
		).toEqual({
			page: 4,
			perPage: 50,
			q: "bowl",
			sortBy: "createdAt",
			sortOrder: "desc",
		});
	});

	it("falls back rather than erroring on malformed values", () => {
		expect(parse({ page: "abc" }).page).toBe(1);
		expect(parse({ page: 0 }).page).toBe(1);
		expect(parse({ page: 1.5 }).page).toBe(1);
		// Not one of the offered page sizes, so the server would reject it.
		expect(parse({ perPage: 30 }).perPage).toBe(25);
		expect(parse({ sortBy: "calories" }).sortBy).toBe("name");
		expect(parse({ sortOrder: "sideways" }).sortOrder).toBe("asc");
	});

	it("caps the search text at the length the server accepts", () => {
		expect(parse({ q: "x".repeat(150) }).q).toHaveLength(100);
	});
});
