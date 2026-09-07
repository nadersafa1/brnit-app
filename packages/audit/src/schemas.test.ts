import { describe, expect, it } from "bun:test";
import { auditLogWriteInputSchema } from "./schemas";
import { isAuditLogDbEnabled } from "./write-audit-log";

const validInput = {
	actionName: "CreateAdmin",
	durationMs: 12.7,
	endpoint: "/api/admin/food-items",
	ip: "203.0.113.7",
	organizationId: "org_1",
	requestId: "req_1",
	requestMethod: "POST",
	resource: "Admin",
	statusCode: 201,
	success: true,
	userAgent: "brnit-web/1.0",
	userId: "user_1",
	userRole: "admin",
};

describe("auditLogWriteInputSchema", () => {
	it("accepts a complete row", () => {
		expect(auditLogWriteInputSchema.parse(validInput).actionName).toBe(
			"CreateAdmin"
		);
	});

	it("strips unknown keys", () => {
		// This is the enforcement point for the privacy rule: a middleware that
		// spreads `req.body` or a header bag into the input cannot leak it into
		// the column, because zod drops anything not declared here.
		const parsed = auditLogWriteInputSchema.parse({
			...validInput,
			body: { password: "hunter2" },
			headers: { authorization: "Bearer secret" },
		}) as Record<string, unknown>;

		expect(parsed.body).toBeUndefined();
		expect(parsed.headers).toBeUndefined();
		expect(Object.keys(parsed)).not.toContain("password");
	});

	it("has no message field — the writer derives it", () => {
		const parsed = auditLogWriteInputSchema.parse({
			...validInput,
			message: "caller supplied text",
		}) as Record<string, unknown>;

		expect(parsed.message).toBeUndefined();
	});

	it("allows the nullable identity fields to be absent", () => {
		const parsed = auditLogWriteInputSchema.parse({
			actionName: "CreateRequest",
			durationMs: 1,
			endpoint: "/api/x",
			requestId: "req_2",
			requestMethod: "POST",
			statusCode: 500,
			success: false,
		});

		expect(parsed.userId).toBeUndefined();
		expect(parsed.organizationId).toBeUndefined();
	});

	it("rejects an empty requestId or actionName", () => {
		expect(
			auditLogWriteInputSchema.safeParse({ ...validInput, requestId: "" })
				.success
		).toBe(false);
		expect(
			auditLogWriteInputSchema.safeParse({ ...validInput, actionName: "" })
				.success
		).toBe(false);
	});

	it("requires an integer status code", () => {
		expect(
			auditLogWriteInputSchema.safeParse({ ...validInput, statusCode: 201.5 })
				.success
		).toBe(false);
	});
});

describe("isAuditLogDbEnabled", () => {
	it("only accepts the exact string", () => {
		expect(isAuditLogDbEnabled("true")).toBe(true);
	});

	it("rejects other truthy-looking values, so it cannot be switched on by accident", () => {
		for (const value of ["1", "TRUE", "yes", "on", "", undefined, null]) {
			expect(isAuditLogDbEnabled(value)).toBe(false);
		}
	});
});
