import { z } from "zod";

/**
 * The exact set of fields a caller may persist.
 *
 * Zod strips unknown keys, which is the enforcement point for the privacy rule
 * in `docs/migration/api-surface.md` §9: **request bodies and auth headers are
 * never stored**. A middleware that accidentally spreads `req.body` into the
 * write input cannot leak it through here.
 *
 * `message` is deliberately absent — it is derived from `success`/`statusCode`
 * inside the writer so no caller-supplied text ever reaches the column.
 */
export const auditLogWriteInputSchema = z.object({
	/** Explicit override, or `deriveActionName(method, endpoint)`. */
	actionName: z.string().min(1),
	/**
	 * Wall-clock duration of the request. Floats are accepted and floored by the
	 * writer, matching the pre-extraction behaviour.
	 */
	durationMs: z.number(),
	/** Pathname only — never include the query string. */
	endpoint: z.string(),
	ip: z.string().nullish(),
	/**
	 * Resolved from the `?orgId=` query param only. This is a known quirk: the
	 * session's active organization is intentionally *not* used.
	 */
	organizationId: z.string().nullish(),
	requestId: z.string().min(1),
	requestMethod: z.string().min(1),
	resource: z.string().nullish(),
	statusCode: z.number().int(),
	/** `statusCode < 400`. */
	success: z.boolean(),
	userAgent: z.string().nullish(),
	userId: z.string().nullish(),
	userRole: z.string().nullish(),
});

export type AuditLogWriteInput = z.infer<typeof auditLogWriteInputSchema>;
