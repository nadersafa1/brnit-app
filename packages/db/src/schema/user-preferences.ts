/**
 * User-scoped preferences + onboarding questionnaire (one jsonb document per user).
 *
 * Typical `preferences` keys (see @burn-app/user-preferences): `lengthUnit`, optional `heightCm`,
 * `questionnaire` (onboarding answer ids → string or string[]).
 *
 * Apply to Postgres yourself, e.g.:
 * CREATE TABLE "user_preferences" (
 *   "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
 *   "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
 *   "schema_version" integer DEFAULT 0 NOT NULL,
 *   "updated_at" timestamp DEFAULT now() NOT NULL
 * );
 */
import { relations, sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from './auth'

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferences: jsonb('preferences')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  schemaVersion: integer('schema_version').notNull().default(0),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userPreferences.userId],
    references: [user.id],
  }),
}))
