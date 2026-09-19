import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Server-managed version thresholds for the native app — one row per platform.
 *
 * `platform` ("ios" | "android") is the primary key rather than a surrogate id:
 * there is exactly one live configuration per store, so a second row would be a
 * bug rather than history. Edits overwrite in place and the audit trail is the
 * `updated_at` / `updated_by` pair, which is all this has ever needed.
 *
 * **A missing row means the gate is off for that platform.** That is the
 * deliberate fail-open default, and it is why no migration seeds a row: a fresh
 * database, a restored backup, or a platform nobody has configured yet must
 * never block users out of the app. The blocking case has to be switched on by
 * an admin, explicitly.
 *
 * Columns are plain `text`, matching every other enum-like and version-like
 * column in this schema (`user.role`, `device_token.platform`). `platform` is
 * validated on the way in by `appVersionQuerySchema` and the admin body schema
 * in `@brnit/api/version-gate/schemas`; the version strings are compared by
 * `isVersionBelow` from `@brnit/domain`, which is total and never throws, so no
 * DB constraint is needed to keep the read path safe.
 *
 * `updated_by` holds a `user.id` but carries **no foreign key**, on purpose: the
 * configuration must outlive the admin who last touched it, and deleting a
 * staff account must not cascade into disabling the gate.
 */
export const appVersionConfig = pgTable("app_version_config", {
	/** "ios" | "android". No DB constraint — see the note above. */
	platform: text("platform").primaryKey(),
	/** Below this, the app is blocked outright. */
	minVersion: text("min_version").notNull(),
	/** Below this (but at or above `min_version`), the app nudges. */
	latestVersion: text("latest_version").notNull(),
	message: text("message").notNull(),
	storeUrl: text("store_url").notNull(),
	/**
	 * Stamped explicitly by the admin write path rather than via `$onUpdate`,
	 * because that write is an `onConflictDoUpdate` and Drizzle applies
	 * `$onUpdate` only to `db.update()`.
	 */
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	/** `user.id` of the admin who last saved. Intentionally not a foreign key. */
	updatedBy: text("updated_by").notNull(),
});
