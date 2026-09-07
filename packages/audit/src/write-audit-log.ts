import { db } from "@brnit/db";
import { auditLog } from "@brnit/db/schema/audit-log";
import { getLogger } from "@brnit/logger";

import { AUDIT_LOG_DB_ENABLED_VALUE } from "./constants";
import { type AuditLogWriteInput, auditLogWriteInputSchema } from "./schemas";

/**
 * Persists one request-level audit row.
 *
 * **This function never throws and never rejects.** Auditing is an observer of
 * the request, not a participant in it — a failed insert must not turn a
 * successful mutation into a 500. Callers fire it without awaiting; the
 * `.catch()` here means an unhandled rejection can never reach the process
 * handler and trigger a shutdown.
 *
 * Unlike the pre-extraction version this takes a plain object rather than a
 * `NextRequest`: the HTTP adapter resolves the session, headers and org id and
 * hands over already-derived values, so the writer has no framework dependency
 * and works from Express, a worker, or a test.
 */
export async function writeAuditLog(input: AuditLogWriteInput): Promise<void> {
	try {
		// Parsing strips unknown keys, which is what stops a caller that spread
		// `req.body` into the input from persisting a request body.
		const values = auditLogWriteInputSchema.parse(input);

		// Floor and clamp: the column is an integer, and a clock adjustment
		// mid-request can otherwise produce a negative duration.
		const durationMs = Math.max(0, Math.floor(values.durationMs));

		// Deliberately short and non-sensitive — never echo an error message,
		// which may carry row data or SQL.
		const message = values.success
			? null
			: `Request failed (${values.statusCode})`;

		await db.insert(auditLog).values({
			actionName: values.actionName,
			durationMs,
			endpoint: values.endpoint,
			ip: values.ip ?? null,
			message,
			organizationId: values.organizationId ?? null,
			requestId: values.requestId,
			requestMethod: values.requestMethod,
			resource: values.resource ?? null,
			statusCode: values.statusCode,
			success: values.success,
			userAgent: values.userAgent ?? null,
			userId: values.userId ?? null,
			userRole: values.userRole ?? null,
		});
	} catch (err: unknown) {
		getLogger().error({ err }, "failed to write audit log");
	}
}

/**
 * Whether the DB writer is switched on.
 *
 * Opt-in by design: the row carries identity and endpoint data, so a deployment
 * that has not decided on a retention policy should not be accumulating it.
 * Compared against the exact string, so `AUDIT_LOG_DB_ENABLED=1` does not
 * silently enable it.
 */
export function isAuditLogDbEnabled(flag: string | undefined | null): boolean {
	return flag === AUDIT_LOG_DB_ENABLED_VALUE;
}
