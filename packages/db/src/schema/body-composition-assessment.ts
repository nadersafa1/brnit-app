import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, numeric, index } from 'drizzle-orm/pg-core'
import { member, user } from './auth'

export const bodyCompositionAssessment = pgTable(
  'body_composition_assessment',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text('member_id')
      .notNull()
      .references(() => member.id, { onDelete: 'cascade' }),
    assessedAt: timestamp('assessed_at').notNull(),
    recordedById: text('recorded_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'no action' }),
    heightCm: numeric('height_cm', { precision: 5, scale: 2 }).notNull(),
    bodyFatPercent: numeric('body_fat_percent', {
      precision: 5,
      scale: 2,
    }).notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
    bmi: numeric('bmi', { precision: 4, scale: 2 }).notNull(),
    muscleMassKg: numeric('muscle_mass_kg', {
      precision: 5,
      scale: 2,
    }).notNull(),
    visceralFatAreaCm2: numeric('visceral_fat_area_cm2', {
      precision: 6,
      scale: 2,
    }).notNull(),
    bodyWaterL: numeric('body_water_l', { precision: 5, scale: 2 }).notNull(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('body_composition_assessment_member_idx').on(table.memberId),
    index('body_composition_assessment_assessed_at_idx').on(table.assessedAt),
    index('body_composition_assessment_recorded_by_idx').on(table.recordedById),
  ],
)

export const bodyCompositionAssessmentRelations = relations(
  bodyCompositionAssessment,
  ({ one }) => ({
    member: one(member, {
      fields: [bodyCompositionAssessment.memberId],
      references: [member.id],
    }),
    recordedBy: one(user, {
      fields: [bodyCompositionAssessment.recordedById],
      references: [user.id],
    }),
  }),
)
