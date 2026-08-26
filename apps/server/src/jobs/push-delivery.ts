import {
	deleteStaleDevicePushTokens,
	listDevicePushTokensForUser,
} from "@brnit/api/push/device-push-token.service";
import { sendPushToTokens } from "@brnit/push";
import type { PushNotificationJobPayload } from "@brnit/push/schemas";

/**
 * Actual FCM delivery to one user's devices.
 *
 * Lives in `apps/server` rather than `@brnit/api` because it imports
 * `firebase-admin`; the contract package stays free of it so the web and native
 * bundles can keep importing `@brnit/api`.
 */

/**
 * Android notification channels. The client creates one channel per category so
 * a member can mute meal reminders without losing plan updates, which means
 * these strings are part of the native app's contract — changing one silently
 * drops the notification into an unconfigured channel.
 */
const CHANNEL_ID_BY_CATEGORY = {
	meal_reminder: "meal_reminder",
	streak_nudge: "streak_nudge",
	plan_update: "plan_update",
} as const;

const DEFAULT_CHANNEL_ID = "default";

function channelIdForCategory(
	category: PushNotificationJobPayload["category"]
): string {
	return category ? CHANNEL_ID_BY_CATEGORY[category] : DEFAULT_CHANNEL_ID;
}

export interface DeliverPushResult {
	failed: number;
	sent: number;
}

/**
 * Sends `payload` to every device the user has registered, pruning whatever FCM
 * reports as dead.
 *
 * A user with no devices is `{ sent: 0, failed: 0 }`, not an error — most users
 * are web-only, and treating that as a failure would make every job retry five
 * times for nothing.
 */
export async function deliverPushToUser(
	payload: PushNotificationJobPayload
): Promise<DeliverPushResult> {
	const tokens = await listDevicePushTokensForUser(payload.userId);
	if (tokens.length === 0) {
		return { sent: 0, failed: 0 };
	}

	const result = await sendPushToTokens({
		tokens,
		title: payload.title,
		body: payload.body,
		data: payload.data,
		channelId: channelIdForCategory(payload.category),
	});

	if (result.staleTokens.length > 0) {
		await deleteStaleDevicePushTokens(result.staleTokens);
	}

	return { sent: result.sent, failed: result.failed };
}
