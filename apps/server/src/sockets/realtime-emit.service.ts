import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";
import type {
	AssessmentRecordedPayload,
	PlanChangedPayload,
} from "@brnit/realtime";
import {
	assessmentRecordedPayloadSchema,
	organizationRoom,
	planChangedPayloadSchema,
	REALTIME_EVENTS,
	userRoom,
} from "@brnit/realtime";
import type { z } from "zod";
import { getIoEmitter } from "./redis-emitter.js";
import type { AppServer } from "./socket-types.js";

/**
 * The only way anything in `apps/server` puts a message on the wire.
 *
 * Two properties make it safe to call from a controller's side-effect block:
 *
 * 1. **Schema-validated.** Every payload is re-parsed against its contract
 *    schema before it leaves. A drifted emit is dropped with a warning instead
 *    of reaching clients as a shape they cannot parse.
 * 2. **Dual-path.** The API process has a live `Server` and emits directly; a
 *    worker has none and publishes through the Redis emitter. Callers do not
 *    know or care which process they are in.
 */

let socketIo: AppServer | undefined;

/**
 * Setter injection, called by `createSocketServer` as soon as the server
 * exists. Keeps this module out of an import cycle with the entrypoint.
 */
export function setSocketIoForEmit(io: AppServer): void {
	socketIo = io;
}

async function emitValidatedToRoom<Schema extends z.ZodType>(
	room: string,
	event: string,
	schema: Schema,
	payload: unknown
): Promise<void> {
	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		logger.warn(
			{ event, room, issues: parsed.error.issues },
			"realtime emit skipped: invalid payload"
		);
		return;
	}

	try {
		if (socketIo) {
			socketIo.to(room).emit(event, parsed.data);
			return;
		}

		const emitter = await getIoEmitter();
		if (!emitter) {
			// Without Redis and without a local `Server` there is no transport at
			// all — normal in a worker during local dev, worth a warning in any
			// deployment that does have Redis configured.
			if (env.REDIS_URL) {
				logger.warn({ event, room }, "realtime emit skipped: no io or emitter");
			}
			return;
		}
		emitter.to(room).emit(event, parsed.data);
	} catch (error: unknown) {
		logger.error({ err: error, event, room }, "realtime emit failed");
	}
}

function emitBestEffort<Schema extends z.ZodType>(
	room: string,
	event: string,
	schema: Schema,
	payload: unknown
): void {
	emitValidatedToRoom(room, event, schema, payload).catch(() => undefined);
}

/**
 * Tells a member their Home screen is stale. Emitted after a *staff* write —
 * the member's own writes update their client directly.
 */
export function emitPlanChangedBestEffort(payload: PlanChangedPayload): void {
	emitBestEffort(
		userRoom(payload.userId),
		REALTIME_EVENTS.PLAN_CHANGED,
		planChangedPayloadSchema,
		payload
	);
}

/**
 * Fans a new assessment out to the member and to their organization's staff.
 *
 * Two emits rather than one broadcast: the member must not receive the org
 * room's traffic, and staff must not be joined to a member's room.
 */
export function emitAssessmentRecordedBestEffort(
	payload: AssessmentRecordedPayload
): void {
	for (const room of [
		userRoom(payload.userId),
		organizationRoom(payload.organizationId),
	]) {
		emitBestEffort(
			room,
			REALTIME_EVENTS.ASSESSMENT_RECORDED,
			assessmentRecordedPayloadSchema,
			payload
		);
	}
}
