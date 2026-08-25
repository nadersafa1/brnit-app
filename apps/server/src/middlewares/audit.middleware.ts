// TODO(@brnit/audit): these symbols are the documented surface of the audit
// package's barrel (`packages/audit/package.json` maps "." to "./src/index.ts").
// `derive-audit-fields.ts` and `schemas.ts` already exist; `index.ts` and the
// `writeAuditLog` writer are still being extracted in parallel. Nothing here
// needs to change when they land — only the import resolves.
import {
	type AuditLogWriteInput,
	deriveActionName,
	deriveEndpointPath,
	deriveOrganizationIdFromUrl,
	deriveResource,
	extractClientIp,
	extractUserAgent,
	writeAuditLog,
} from "@brnit/audit";
import { isAuditableMethod } from "@brnit/audit/constants";
import { auth } from "@brnit/auth";
import { env } from "@brnit/env/server";
import { getLogger } from "@brnit/logger";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";

/**
 * Strips the API version segment before deriving `resource` / `actionName`.
 *
 * `deriveResource` takes the first path segment after `/api/`, so under the new
 * `/api/v1` mount every row would otherwise read `resource: "V1"`. Stripping
 * here keeps the labels identical to the pre-overhaul rows (`"Admin"`,
 * `"Member"`, `"Nutritionist"`) while the stored `endpoint` keeps the real,
 * versioned pathname.
 */
const API_VERSION_SEGMENT = /^\/api\/v\d+(?=\/|$)/;

export function auditDerivationPath(pathname: string): string {
	return pathname.replace(API_VERSION_SEGMENT, "/api");
}

interface AuditActor {
	userId: string | null;
	userRole: string | null;
}

const ANONYMOUS_ACTOR: AuditActor = { userId: null, userRole: null };

/**
 * Prefers the session a guard already resolved. Unguarded routes (better-auth's
 * own endpoints, public POSTs) still get an actor, matching the pre-overhaul
 * writer which always called `getSession` itself.
 */
async function resolveActor(req: Request): Promise<AuditActor> {
	const attached = req.auth?.user;
	if (attached) {
		return { userId: attached.id, userRole: attached.role ?? null };
	}
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});
	if (!session?.user) {
		return ANONYMOUS_ACTOR;
	}
	return { userId: session.user.id, userRole: session.user.role ?? null };
}

function buildAuditInput(
	req: Request,
	actor: AuditActor,
	statusCode: number,
	durationMs: number
): AuditLogWriteInput {
	const url = req.originalUrl || req.url;
	const endpoint = deriveEndpointPath(url);
	const derivationPath = auditDerivationPath(endpoint);

	return {
		actionName: deriveActionName(req.method, derivationPath),
		durationMs,
		endpoint,
		ip: extractClientIp(req.headers),
		// Preserved quirk: the session's active organization is deliberately not
		// consulted — only an explicit `?orgId=` is recorded.
		organizationId: deriveOrganizationIdFromUrl(url),
		// pino-http types `req.id` as `ReqId` (`string | number | object`) because
		// `genReqId` may return any of them; the column is text.
		requestId: String(req.id),
		requestMethod: req.method,
		resource: deriveResource(derivationPath),
		statusCode,
		success: statusCode < 400,
		userAgent: extractUserAgent(req.headers),
		userId: actor.userId,
		userRole: actor.userRole,
	};
}

/**
 * Writes one `audit_log` row per completed mutating request.
 *
 * Replaces the pre-overhaul `withRequestLogging` wrapper: access logging now
 * belongs to pino-http, and this middleware keeps only the DB half. Enabled
 * solely when `AUDIT_LOG_DB_ENABLED` is `"true"` and the method is
 * POST/PUT/PATCH/DELETE.
 *
 * Fire-and-forget by design — the row is written after `finish`, off the
 * response path, and a failure is logged rather than thrown. The rejection is
 * caught explicitly so a writer failure can never reach the process-level
 * `unhandledRejection` handler and trigger a shutdown.
 */
export function auditMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	if (!(env.AUDIT_LOG_DB_ENABLED && isAuditableMethod(req.method))) {
		next();
		return;
	}

	const startedAt = performance.now();

	res.on("finish", () => {
		const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
		resolveActor(req)
			.then((actor) =>
				writeAuditLog(buildAuditInput(req, actor, res.statusCode, durationMs))
			)
			.catch((err: unknown) => {
				getLogger().error({ err }, "failed to write audit log");
			});
	});

	next();
}
