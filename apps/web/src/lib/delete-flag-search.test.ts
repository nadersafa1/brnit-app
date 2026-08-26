import { describe, expect, it } from "bun:test";

import { parseDeleteFlagSearch } from "./delete-flag-search";

function parse(search: Record<string, unknown>) {
	return parseDeleteFlagSearch(
		search as Parameters<typeof parseDeleteFlagSearch>[0]
	);
}

describe("parseDeleteFlagSearch", () => {
	it("is closed unless the flag says otherwise", () => {
		expect(parse({}).delete).toBe(false);
		expect(parse({ delete: "0" }).delete).toBe(false);
		expect(parse({ delete: "yes" }).delete).toBe(false);
	});

	/** The pre-overhaul screens linked `…/{id}?delete=1`; those links must keep working. */
	it("accepts the legacy `1` as well as a serialised boolean", () => {
		expect(parse({ delete: "1" }).delete).toBe(true);
		expect(parse({ delete: 1 }).delete).toBe(true);
		expect(parse({ delete: "true" }).delete).toBe(true);
		expect(parse({ delete: true }).delete).toBe(true);
	});
});
