import { db } from "@brnit/db";
import { deviceToken } from "@brnit/db/schema/device-token";
import type {
	DeleteDevicePushTokenBody,
	RegisterDevicePushTokenBody,
} from "@brnit/push/schemas";
import { and, eq, inArray } from "drizzle-orm";

import type { Context } from "../context";
import { requireContextUser } from "../context";

/**
 * Device push-token storage.
 *
 * Deliberately free of `firebase-admin`: `@brnit/api` owns *which* tokens exist
 * and who they belong to, while sending is infrastructure that lives in
 * `apps/server`. That split is what keeps the contract package importable by
 * the clients.
 */

export async function registerDevicePushToken(
	ctx: Context,
	input: RegisterDevicePushTokenBody
): Promise<{ registered: true }> {
	const user = requireContextUser(ctx);
	const now = new Date();

	// Conflict on `token`, not on `(userId, token)`: a device that changes hands
	// keeps its FCM token, and the row must follow the current owner or the
	// previous one keeps receiving this user's reminders.
	await db
		.insert(deviceToken)
		.values({
			userId: user.id,
			token: input.token,
			platform: input.platform,
			lastSeenAt: now,
		})
		.onConflictDoUpdate({
			target: deviceToken.token,
			set: {
				userId: user.id,
				platform: input.platform,
				lastSeenAt: now,
			},
		});

	return { registered: true };
}

/**
 * Forgets one device. Scoped to the caller so a leaked token cannot be used to
 * silence somebody else's notifications.
 */
export async function deleteDevicePushToken(
	ctx: Context,
	input: DeleteDevicePushTokenBody
): Promise<{ deleted: boolean }> {
	const user = requireContextUser(ctx);

	const deleted = await db
		.delete(deviceToken)
		.where(
			and(eq(deviceToken.userId, user.id), eq(deviceToken.token, input.token))
		)
		.returning({ id: deviceToken.id });

	return { deleted: deleted.length > 0 };
}

/** Every token registered for a user; empty when they have no device. */
export async function listDevicePushTokensForUser(
	userId: string
): Promise<readonly string[]> {
	const rows = await db
		.select({ token: deviceToken.token })
		.from(deviceToken)
		.where(eq(deviceToken.userId, userId));
	return rows.map((row) => row.token);
}

/**
 * Prunes tokens FCM reported as unregistered or invalid.
 *
 * Not scoped to a user on purpose — the caller learned these are dead from FCM
 * itself, and the row may already have been re-pointed at a different user by a
 * concurrent registration.
 */
export async function deleteStaleDevicePushTokens(
	tokens: readonly string[]
): Promise<void> {
	if (tokens.length === 0) {
		return;
	}
	await db.delete(deviceToken).where(inArray(deviceToken.token, [...tokens]));
}
