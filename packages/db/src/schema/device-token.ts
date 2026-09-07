import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * One FCM registration token per device, per signed-in user.
 *
 * `token` is unique across the whole table rather than per user: a phone that
 * changes hands keeps its FCM token, so the same string can arrive under a new
 * `user_id`. The registration path upserts on that unique constraint and
 * rewrites `user_id`, which is what stops the previous owner from receiving the
 * new owner's meal reminders.
 *
 * Rows are deleted, never soft-deleted, on two triggers: the user signs out or
 * turns notifications off (explicit delete), and FCM reports the token as
 * unregistered or invalid while sending (see `staleTokens` in
 * `@brnit/push`). Everything else — quota, unavailable — is transient and must
 * leave the row alone.
 *
 * `platform` is plain `text`, matching every other enum-like column in this
 * schema (`user.role`, `member.role`, `diet_plan_meal.meal_type`). It is
 * validated on the way in by `pushPlatformSchema` from `@brnit/push/schemas`;
 * there is deliberately no DB constraint, so adding `web` later needs no
 * migration.
 */
export const deviceToken = pgTable(
	"device_token",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		platform: text("platform").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		/**
		 * Refreshed by the registration upsert on every app launch. Set
		 * explicitly rather than via `$onUpdate`, because the write path is an
		 * `onConflictDoUpdate` and Drizzle applies `$onUpdate` only to
		 * `db.update()`.
		 */
		lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
	},
	(table) => [index("device_token_user_idx").on(table.userId)]
);

export const deviceTokenRelations = relations(deviceToken, ({ one }) => ({
	user: one(user, {
		fields: [deviceToken.userId],
		references: [user.id],
	}),
}));
