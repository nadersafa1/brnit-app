import { describe, expect, it } from "bun:test";
import { HttpError } from "@brnit/api";

import {
	buildApiErrorBody,
	buildUnknownErrorBody,
	clientMessageForUnknownError,
	extractErrorCode,
	findPostgresErrorCode,
	mapKnownErrorToHttpError,
	PG_UNIQUE_VIOLATION,
} from "./error-format.js";

/** Stand-in for the `pg` `DatabaseError` Drizzle hangs off `cause`. */
function pgError(code: string): Error & { code: string } {
	const error = new Error(
		"duplicate key value violates unique constraint"
	) as Error & { code: string };
	error.code = code;
	return error;
}

describe("extractErrorCode", () => {
	it("returns code when causeDetail carries one", () => {
		expect(extractErrorCode({ code: "OVERLAP", assignmentId: "a1" })).toBe(
			"OVERLAP"
		);
	});

	it("returns undefined when causeDetail has no code", () => {
		expect(extractErrorCode({ fieldErrors: {} })).toBeUndefined();
	});

	it("returns undefined for non-objects", () => {
		expect(extractErrorCode("OVERLAP")).toBeUndefined();
	});
});

describe("buildApiErrorBody", () => {
	it("returns only `error` when there is no causeDetail", () => {
		expect(buildApiErrorBody("Not found")).toEqual({ error: "Not found" });
	});

	it("lifts `code` out of causeDetail and keeps details", () => {
		expect(
			buildApiErrorBody("Assignment overlaps an existing plan", {
				code: "OVERLAP",
				conflictingAssignmentId: "a1",
			})
		).toEqual({
			error: "Assignment overlaps an existing plan",
			code: "OVERLAP",
			details: { code: "OVERLAP", conflictingAssignmentId: "a1" },
		});
	});

	it("keeps details without a code (zod flattenError output)", () => {
		expect(
			buildApiErrorBody("Invalid request body", {
				formErrors: [],
				fieldErrors: { name: ["Required"] },
			})
		).toEqual({
			error: "Invalid request body",
			details: { formErrors: [], fieldErrors: { name: ["Required"] } },
		});
	});
});

describe("findPostgresErrorCode", () => {
	it("reads a SQLSTATE off the error itself", () => {
		expect(findPostgresErrorCode(pgError(PG_UNIQUE_VIOLATION))).toBe("23505");
	});

	it("walks the cause chain Drizzle wraps driver errors in", () => {
		const wrapped = new Error("Failed query", {
			cause: new Error("driver", { cause: pgError("23503") }),
		});
		expect(findPostgresErrorCode(wrapped)).toBe("23503");
	});

	it("ignores non-SQLSTATE codes such as Node errno strings", () => {
		expect(findPostgresErrorCode(pgError("ECONNREFUSED"))).toBeUndefined();
	});

	it("returns undefined for a plain error", () => {
		expect(findPostgresErrorCode(new Error("boom"))).toBeUndefined();
	});

	it("terminates on a self-referencing cause chain", () => {
		const looping = new Error("loop") as Error & { cause?: unknown };
		looping.cause = looping;
		expect(findPostgresErrorCode(looping)).toBeUndefined();
	});
});

describe("mapKnownErrorToHttpError", () => {
	it("passes an HttpError through unchanged", () => {
		const err = new HttpError(403, "Forbidden");
		expect(mapKnownErrorToHttpError(err)).toBe(err);
	});

	it("maps a Postgres unique violation to 409", () => {
		const mapped = mapKnownErrorToHttpError(pgError(PG_UNIQUE_VIOLATION));
		expect(mapped?.status).toBe(409);
		expect(mapped?.message).toBe("Conflict");
	});

	it("maps a wrapped unique violation to 409", () => {
		const mapped = mapKnownErrorToHttpError(
			new Error("Failed query", { cause: pgError(PG_UNIQUE_VIOLATION) })
		);
		expect(mapped?.status).toBe(409);
	});

	it("returns null for foreign-key violations, which stay a sanitized 500", () => {
		expect(mapKnownErrorToHttpError(pgError("23503"))).toBe(null);
	});

	it("returns null for unknown errors", () => {
		expect(mapKnownErrorToHttpError(new Error("boom"))).toBe(null);
	});
});

describe("clientMessageForUnknownError", () => {
	it("hides driver messages in production", () => {
		expect(
			clientMessageForUnknownError(new Error("relation does not exist"), true)
		).toBe("Internal Server Error");
	});

	it("exposes the message outside production", () => {
		expect(
			clientMessageForUnknownError(new Error("relation does not exist"), false)
		).toBe("relation does not exist");
	});
});

describe("buildUnknownErrorBody", () => {
	it("includes the stack outside production only", () => {
		const err = new Error("boom");

		const devBody = buildUnknownErrorBody(err, false);
		expect(devBody.error).toBe("boom");
		expect(devBody.stack).toBeString();

		expect(buildUnknownErrorBody(err, true)).toEqual({
			error: "Internal Server Error",
		});
	});
});
