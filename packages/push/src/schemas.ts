import { z } from "zod";

const MAX_TOKEN_LENGTH = 4096;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 500;

/**
 * Platforms brnit ships to. `web` is absent because the Vite SPA has no service
 * worker and no FCM registration path — add it here the day it does.
 */
export const pushPlatformSchema = z.enum(["ios", "android"]);

export type PushPlatform = z.infer<typeof pushPlatformSchema>;

/** Body of the native app's "remember this device" call. */
export const registerDevicePushTokenBodySchema = z.object({
	token: z.string().min(1).max(MAX_TOKEN_LENGTH),
	platform: pushPlatformSchema,
});

export type RegisterDevicePushTokenBody = z.infer<
	typeof registerDevicePushTokenBodySchema
>;

/** Body of the sign-out / notifications-off call. */
export const deleteDevicePushTokenBodySchema = z.object({
	token: z.string().min(1).max(MAX_TOKEN_LENGTH),
});

export type DeleteDevicePushTokenBody = z.infer<
	typeof deleteDevicePushTokenBodySchema
>;

/**
 * Notification categories, one per Android channel.
 *
 * These are the only three kinds of push brnit sends, and each maps to a queue
 * in `apps/server/src/jobs`. A category the user can mute is a category the
 * client can name, so this list is part of the contract rather than a server
 * detail.
 */
export const pushNotificationCategorySchema = z.enum([
	/** "Time to eat" — fired from the meal-reminder queue at a slot's time. */
	"meal_reminder",
	/** "Log something today to keep your streak" — the daily nudge cron. */
	"streak_nudge",
	/** A nutritionist changed the member's plan. */
	"plan_update",
]);

export type PushNotificationCategory = z.infer<
	typeof pushNotificationCategorySchema
>;

/**
 * FCM data payloads are string→string on the wire; anything richer has to be
 * serialized by the caller, so the schema refuses to pretend otherwise.
 */
export const pushNotificationDataSchema = z.record(z.string(), z.string());

export const pushNotificationJobPayloadSchema = z.object({
	userId: z.string().min(1),
	title: z.string().min(1).max(MAX_TITLE_LENGTH),
	body: z.string().min(1).max(MAX_BODY_LENGTH),
	data: pushNotificationDataSchema.optional(),
	category: pushNotificationCategorySchema.optional(),
});

export type PushNotificationJobPayload = z.infer<
	typeof pushNotificationJobPayloadSchema
>;

/**
 * Re-validation entry point for the worker. A job can sit in Redis across a
 * deploy, so what comes back out is `unknown` no matter what was put in.
 */
export function parsePushNotificationJobPayload(data: unknown) {
	return pushNotificationJobPayloadSchema.safeParse(data);
}
