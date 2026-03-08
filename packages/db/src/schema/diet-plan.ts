import { relations } from 'drizzle-orm'
import {
  check,
  pgTable,
  text,
  timestamp,
  date,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { meal } from './meal'
import { user } from './auth'
import { member } from './auth'

export const dietPlan = pgTable('diet_plan', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

/** day_number = 0 means the meal repeats on every day of the plan. day_number >= 1 is day-specific (Day 1, Day 2, ...). */
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
    dayNumber: integer('day_number').notNull(), // 0 = repeat all days, >= 1 = specific day
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

export const dietPlanAssignment = pgTable(
  'diet_plan_assignment',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text('member_id').references(() => member.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    dietPlanId: text('diet_plan_id')
      .notNull()
      .references(() => dietPlan.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('diet_plan_assignment_member_idx').on(table.memberId),
    index('diet_plan_assignment_user_idx').on(table.userId),
    index('diet_plan_assignment_plan_idx').on(table.dietPlanId),
    check(
      'diet_plan_assignment_assignee_check',
      sql`((${table.memberId} IS NOT NULL AND ${table.userId} IS NULL) OR (${table.memberId} IS NULL AND ${table.userId} IS NOT NULL))`
    ),
    check(
      'diet_plan_assignment_date_range_check',
      sql`${table.startDate} <= ${table.endDate}`
    ),
  ]
)

export const dietPlanMealConsumption = pgTable(
  'diet_plan_meal_consumption',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dietPlanAssignmentId: text('diet_plan_assignment_id')
      .notNull()
      .references(() => dietPlanAssignment.id, { onDelete: 'cascade' }),
    dietPlanMealId: text('diet_plan_meal_id')
      .notNull()
      .references(() => dietPlanMeal.id, { onDelete: 'cascade' }),
    consumedAt: timestamp('consumed_at').notNull(),
    consumedDate: date('consumed_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('diet_plan_meal_consumption_assignment_idx').on(table.dietPlanAssignmentId),
    index('diet_plan_meal_consumption_meal_idx').on(table.dietPlanMealId),
    uniqueIndex('diet_plan_meal_consumption_unique_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
      table.consumedDate
    ),
  ]
)

export const dietPlanRelations = relations(dietPlan, ({ many }) => ({
  dietPlanMeals: many(dietPlanMeal),
  dietPlanAssignments: many(dietPlanAssignment),
}))

export const dietPlanMealRelations = relations(dietPlanMeal, ({ one, many }) => ({
  dietPlan: one(dietPlan, {
    fields: [dietPlanMeal.dietPlanId],
    references: [dietPlan.id],
  }),
  meal: one(meal, {
    fields: [dietPlanMeal.mealId],
    references: [meal.id],
  }),
  consumptions: many(dietPlanMealConsumption),
}))

export const dietPlanAssignmentRelations = relations(dietPlanAssignment, ({ one, many }) => ({
  dietPlan: one(dietPlan, {
    fields: [dietPlanAssignment.dietPlanId],
    references: [dietPlan.id],
  }),
  member: one(member, {
    fields: [dietPlanAssignment.memberId],
    references: [member.id],
  }),
  user: one(user, {
    fields: [dietPlanAssignment.userId],
    references: [user.id],
  }),
  consumptions: many(dietPlanMealConsumption),
}))

export const dietPlanMealConsumptionRelations = relations(dietPlanMealConsumption, ({ one }) => ({
  dietPlanAssignment: one(dietPlanAssignment, {
    fields: [dietPlanMealConsumption.dietPlanAssignmentId],
    references: [dietPlanAssignment.id],
  }),
  dietPlanMeal: one(dietPlanMeal, {
    fields: [dietPlanMealConsumption.dietPlanMealId],
    references: [dietPlanMeal.id],
  }),
}))
