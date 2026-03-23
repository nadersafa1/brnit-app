import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

export const userOnboardingAnswers = pgTable('user_onboarding_answers', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  answers: jsonb('answers')
    .$type<Record<string, string | string[]>>()
    .notNull()
    .default({}),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const userOnboardingAnswersRelations = relations(
  userOnboardingAnswers,
  ({ one }) => ({
    user: one(user, {
      fields: [userOnboardingAnswers.userId],
      references: [user.id],
    }),
  }),
)
