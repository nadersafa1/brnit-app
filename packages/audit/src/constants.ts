/**
 * brnit's audit model is **request-level**: one `audit_log` row per completed
 * mutating HTTP request. It is deliberately not the entity-event model used by
 * the reference repo — do not "upgrade" it without a migration.
 */

/** The DB writer is opt-in; `AUDIT_LOG_DB_ENABLED` must equal exactly this. */
export const AUDIT_LOG_DB_ENABLED_VALUE = "true";

/** Only mutating methods produce an audit row. Reads are never persisted. */
export const AUDIT_WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

export type AuditWriteMethod = (typeof AUDIT_WRITE_METHODS)[number];

/** Resource label used when a pathname has no segment after `/api/`. */
export const AUDIT_FALLBACK_RESOURCE = "Request";

export function isAuditableMethod(method: string): method is AuditWriteMethod {
	return (AUDIT_WRITE_METHODS as readonly string[]).includes(method);
}
