import { describe, expect, it } from "bun:test";

import {
	findMissingIds,
	findRemoveUpdateConflicts,
	uniqueIds,
} from "./mutation-ids";

describe("findRemoveUpdateConflicts", () => {
	it("returns nothing when remove is absent", () => {
		expect(findRemoveUpdateConflicts(undefined, ["a", "b"])).toEqual([]);
	});

	it("returns nothing when remove is empty", () => {
		expect(findRemoveUpdateConflicts([], ["a", "b"])).toEqual([]);
	});

	it("returns nothing when the two lists are disjoint", () => {
		expect(findRemoveUpdateConflicts(["a"], ["b", "c"])).toEqual([]);
	});

	it("reports an id that appears in both lists", () => {
		expect(findRemoveUpdateConflicts(["a", "b"], ["b"])).toEqual(["b"]);
	});

	it("reports every overlapping id in update order", () => {
		expect(findRemoveUpdateConflicts(["c", "a"], ["a", "b", "c"])).toEqual([
			"a",
			"c",
		]);
	});
});

describe("findMissingIds", () => {
	it("returns nothing when every requested id exists", () => {
		expect(findMissingIds(["a", "b"], ["b", "a", "c"])).toEqual([]);
	});

	it("returns the absent ids in request order", () => {
		expect(findMissingIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
	});

	it("treats an empty existing set as everything missing", () => {
		expect(findMissingIds(["a"], [])).toEqual(["a"]);
	});
});

describe("uniqueIds", () => {
	it("dedupes while keeping first-seen order", () => {
		expect(uniqueIds(["b", "a", "b", "c", "a"])).toEqual(["b", "a", "c"]);
	});

	it("returns an empty array unchanged", () => {
		expect(uniqueIds([])).toEqual([]);
	});
});
