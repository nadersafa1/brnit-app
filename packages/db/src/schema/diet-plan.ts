import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { member, user } from './auth'
import { foodItem } from './food-item'
import { meal, mealItem } from './meal'

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
    scheduledTime: text('scheduled_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('diet_plan_meal_plan_idx').on(table.dietPlanId),
    index('diet_plan_meal_day_idx').on(table.dietPlanId, table.dayNumber),
    index('diet_plan_meal_slot_idx').on(
      table.dietPlanId,
      table.dayNumber,
      table.mealType,
      table.mealOrder,
    ),
  ],
)

export const dietPlanAssignment = pgTable(
  'diet_plan_assignment',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text('member_id').references(() => member.id, {
      onDelete: 'cascade',
    }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    dietPlanId: text('diet_plan_id')
      .notNull()
      .references(() => dietPlan.id, { onDelete: 'restrict' }),
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
      sql`((${table.memberId} IS NOT NULL AND ${table.userId} IS NULL) OR (${table.memberId} IS NULL AND ${table.userId} IS NOT NULL))`,
    ),
    check(
      'diet_plan_assignment_date_range_check',
      sql`${table.startDate} <= ${table.endDate}`,
    ),
  ],
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
    index('diet_plan_meal_consumption_assignment_idx').on(
      table.dietPlanAssignmentId,
    ),
    index('diet_plan_meal_consumption_meal_idx').on(table.dietPlanMealId),
    uniqueIndex('diet_plan_meal_consumption_unique_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
      table.consumedDate,
    ),
  ],
)

export const dietPlanMealItemOverride = pgTable(
  'diet_plan_meal_item_override',
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
    mealItemId: text('meal_item_id')
      .notNull()
      .references(() => mealItem.id, { onDelete: 'cascade' }),
    foodItemId: text('food_item_id')
      .notNull()
      .references(() => foodItem.id, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    quantity: numeric('quantity').notNull(),
    /** NULL = future only (applies when resolution date >= today); non-null = this date only. */
    effectiveDate: date('effective_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('diet_plan_meal_item_override_assignment_idx').on(
      table.dietPlanAssignmentId,
    ),
    index('diet_plan_meal_item_override_assignment_meal_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
    ),
    uniqueIndex('diet_plan_meal_item_override_unique_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
      table.mealItemId,
      table.effectiveDate,
    ),
  ],
)

export const dietPlanMealTimeOverride = pgTable(
  'diet_plan_meal_time_override',
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
    scheduledTime: text('scheduled_time').notNull(),
    /** NULL = future only (applies when resolution date >= today); non-null = this date only. */
    effectiveDate: date('effective_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('diet_plan_meal_time_override_assignment_idx').on(
      table.dietPlanAssignmentId,
    ),
    index('diet_plan_meal_time_override_assignment_meal_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
    ),
    uniqueIndex('diet_plan_meal_time_override_unique_idx').on(
      table.dietPlanAssignmentId,
      table.dietPlanMealId,
      table.effectiveDate,
    ),
  ],
)

export const dietPlanMealConsumptionItem = pgTable(
  'diet_plan_meal_consumption_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dietPlanMealConsumptionId: text('diet_plan_meal_consumption_id')
      .notNull()
      .references(() => dietPlanMealConsumption.id, { onDelete: 'cascade' }),
    foodItemId: text('food_item_id')
      .notNull()
      .references(() => foodItem.id, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    quantity: numeric('quantity').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('diet_plan_meal_consumption_item_consumption_idx').on(
      table.dietPlanMealConsumptionId,
    ),
  ],
)

export const dietPlanRelations = relations(dietPlan, ({ many }) => ({
  dietPlanMeals: many(dietPlanMeal),
  dietPlanAssignments: many(dietPlanAssignment),
}))

export const dietPlanMealRelations = relations(
  dietPlanMeal,
  ({ one, many }) => ({
    dietPlan: one(dietPlan, {
      fields: [dietPlanMeal.dietPlanId],
      references: [dietPlan.id],
    }),
    meal: one(meal, {
      fields: [dietPlanMeal.mealId],
      references: [meal.id],
    }),
    consumptions: many(dietPlanMealConsumption),
    mealItemOverrides: many(dietPlanMealItemOverride),
    mealTimeOverrides: many(dietPlanMealTimeOverride),
  }),
)

export const dietPlanAssignmentRelations = relations(
  dietPlanAssignment,
  ({ one, many }) => ({
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
    mealItemOverrides: many(dietPlanMealItemOverride),
    mealTimeOverrides: many(dietPlanMealTimeOverride),
  }),
)

export const dietPlanMealConsumptionRelations = relations(
  dietPlanMealConsumption,
  ({ one, many }) => ({
    dietPlanAssignment: one(dietPlanAssignment, {
      fields: [dietPlanMealConsumption.dietPlanAssignmentId],
      references: [dietPlanAssignment.id],
    }),
    dietPlanMeal: one(dietPlanMeal, {
      fields: [dietPlanMealConsumption.dietPlanMealId],
      references: [dietPlanMeal.id],
    }),
    consumedItems: many(dietPlanMealConsumptionItem),
  }),
)

export const dietPlanMealItemOverrideRelations = relations(
  dietPlanMealItemOverride,
  ({ one }) => ({
    dietPlanAssignment: one(dietPlanAssignment, {
      fields: [dietPlanMealItemOverride.dietPlanAssignmentId],
      references: [dietPlanAssignment.id],
    }),
    dietPlanMeal: one(dietPlanMeal, {
      fields: [dietPlanMealItemOverride.dietPlanMealId],
      references: [dietPlanMeal.id],
    }),
    mealItem: one(mealItem, {
      fields: [dietPlanMealItemOverride.mealItemId],
      references: [mealItem.id],
    }),
    foodItem: one(foodItem, {
      fields: [dietPlanMealItemOverride.foodItemId],
      references: [foodItem.id],
    }),
  }),
)

export const dietPlanMealTimeOverrideRelations = relations(
  dietPlanMealTimeOverride,
  ({ one }) => ({
    dietPlanAssignment: one(dietPlanAssignment, {
      fields: [dietPlanMealTimeOverride.dietPlanAssignmentId],
      references: [dietPlanAssignment.id],
    }),
    dietPlanMeal: one(dietPlanMeal, {
      fields: [dietPlanMealTimeOverride.dietPlanMealId],
      references: [dietPlanMeal.id],
    }),
  }),
)

export const dietPlanMealConsumptionItemRelations = relations(
  dietPlanMealConsumptionItem,
  ({ one }) => ({
    dietPlanMealConsumption: one(dietPlanMealConsumption, {
      fields: [dietPlanMealConsumptionItem.dietPlanMealConsumptionId],
      references: [dietPlanMealConsumption.id],
    }),
    foodItem: one(foodItem, {
      fields: [dietPlanMealConsumptionItem.foodItemId],
      references: [foodItem.id],
    }),
  }),
)
