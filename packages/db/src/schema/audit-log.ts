import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

/**
 * Phase 2 audit logging (console-only in Phase 1).
 * Stores a row per API request completion for write operations.
 *
 * NOTE: Keep this schema privacy-safe; never store raw request bodies or auth headers.
 */
export const auditLog = pgTable(
	"audit_log",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		requestId: text("request_id").notNull(),

		userId: text("user_id"),
		userRole: text("user_role"),

		organizationId: text("organization_id"),
		memberId: text("member_id"),

		actionName: text("action_name").notNull(),
		resource: text("resource"),

		endpoint: text("endpoint"),
		requestMethod: text("request_method").notNull(),

		statusCode: integer("status_code").notNull(),
		success: boolean("success").notNull(),

		ip: text("ip"),
		userAgent: text("user_agent"),

		durationMs: integer("duration_ms"),
		message: text("message"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("audit_log_createdAt_idx").on(table.createdAt),
		index("audit_log_requestId_idx").on(table.requestId),
		index("audit_log_userId_idx").on(table.userId),
		index("audit_log_organizationId_idx").on(table.organizationId),
	]
);
