import { describe, expect, it } from "bun:test";

import {
	pageSchema,
	paginationQueryInput,
	perPageSchema,
	queryParam,
	sortOrderSchema,
	textSearchSchema,
} from "./query-params";

describe("pageSchema", () => {
	it("defaults to page 1 when absent", () => {
		expect(pageSchema.parse(undefined)).toBe(1);
	});

	it("parses a numeric string", () => {
		expect(pageSchema.parse("3")).toBe(3);
	});

	it("rejects page 0 and negatives", () => {
		expect(pageSchema.safeParse("0").success).toBe(false);
		expect(pageSchema.safeParse("-1").success).toBe(false);
	});

	it("rejects a non-numeric string", () => {
		expect(pageSchema.safeParse("abc").success).toBe(false);
	});
});

describe("perPageSchema", () => {
	it("defaults to 25 when absent", () => {
		expect(perPageSchema.parse(undefined)).toBe(25);
	});

	it("accepts the boundaries", () => {
		expect(perPageSchema.parse("1")).toBe(1);
		expect(perPageSchema.parse("100")).toBe(100);
	});

	it("rejects values outside 1..100", () => {
		expect(perPageSchema.safeParse("0").success).toBe(false);
		expect(perPageSchema.safeParse("101").success).toBe(false);
	});
});

describe("sortOrderSchema", () => {
	it("defaults to desc", () => {
		expect(sortOrderSchema.parse(undefined)).toBe("desc");
	});

	it("rejects anything other than asc or desc", () => {
		expect(sortOrderSchema.safeParse("sideways").success).toBe(false);
	});
});

describe("textSearchSchema", () => {
	it("trims surrounding whitespace", () => {
		expect(textSearchSchema.parse("  kale  ")).toBe("kale");
	});

	it("rejects queries longer than 100 characters", () => {
		expect(textSearchSchema.safeParse("x".repeat(101)).success).toBe(false);
	});
});

describe("queryParam", () => {
	it("passes a string through", () => {
		expect(queryParam("a")).toBe("a");
	});

	it("takes the first entry of a repeated parameter", () => {
		expect(queryParam(["a", "b"])).toBe("a");
	});

	it("returns undefined for anything else", () => {
		expect(queryParam(undefined)).toBeUndefined();
		expect(queryParam({ nested: true })).toBeUndefined();
	});
});

describe("paginationQueryInput", () => {
	it("accepts limit as an alias for perPage", () => {
		expect(paginationQueryInput({ limit: "50" }).perPage).toBe("50");
	});

	it("prefers an explicit perPage over limit", () => {
		expect(paginationQueryInput({ limit: "50", perPage: "10" }).perPage).toBe(
			"10"
		);
	});

	it("leaves both undefined when neither is present", () => {
		expect(paginationQueryInput({})).toEqual({
			page: undefined,
			perPage: undefined,
		});
	});
});
