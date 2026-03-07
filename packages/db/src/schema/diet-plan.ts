import { relations } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  date,
  integer,
  index,
} from 'drizzle-orm/pg-core'
import { meal } from './meal'

export const dietPlan = pgTable('diet_plan', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const dietPlanMeal = pgTable(
  'diet_plan_meal',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dietPlanId: text('diet_plan_id')
      .notNull()
      .references(() => dietPlan.id, { onDelete: 'cascade' }),
    mealId: text('meal_id')
      .notNull()
      .references(() => meal.id, { onDelete: 'restrict' }),
    dayNumber: integer('day_number').notNull(),
    mealType: text('meal_type').notNull(),
    mealOrder: integer('meal_order').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('diet_plan_meal_plan_idx').on(table.dietPlanId),
    index('diet_plan_meal_day_idx').on(table.dietPlanId, table.dayNumber),
    index('diet_plan_meal_slot_idx').on(
      table.dietPlanId,
      table.dayNumber,
      table.mealType,
      table.mealOrder
    ),
  ],
)

export const dietPlanRelations = relations(dietPlan, ({ many }) => ({
  dietPlanMeals: many(dietPlanMeal),
}))

export const dietPlanMealRelations = relations(dietPlanMeal, ({ one }) => ({
  dietPlan: one(dietPlan, {
    fields: [dietPlanMeal.dietPlanId],
    references: [dietPlan.id],
  }),
  meal: one(meal, {
    fields: [dietPlanMeal.mealId],
    references: [meal.id],
  }),
}))
