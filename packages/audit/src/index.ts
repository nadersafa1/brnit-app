/**
 * `@brnit/audit` — request-level audit logging.
 *
 * One `audit_log` row per completed mutating HTTP request. The pure
 * derivations are separated from the writer so the HTTP adapter can compute
 * fields without pulling in the database, and so they are testable without
 * mocks.
 *
 * This barrel is intentional — `noBarrelFile` is disabled for it in
 * `biome.json`.
 */

export type { AuditWriteMethod } from "./constants";
export {
	AUDIT_FALLBACK_RESOURCE,
	AUDIT_LOG_DB_ENABLED_VALUE,
	AUDIT_WRITE_METHODS,
	isAuditableMethod,
} from "./constants";
export type { AuditLogRequestHeaders } from "./derive-audit-fields";
export {
	deriveActionName,
	deriveEndpointPath,
	deriveOrganizationIdFromUrl,
	deriveResource,
	extractClientIp,
	extractUserAgent,
} from "./derive-audit-fields";
export type { AuditLogWriteInput } from "./schemas";
export { auditLogWriteInputSchema } from "./schemas";
export { isAuditLogDbEnabled, writeAuditLog } from "./write-audit-log";
