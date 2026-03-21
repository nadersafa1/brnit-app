import { relations } from 'drizzle-orm'
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core'
import { foodCategory } from './food-category'

/** Unit for food quantity and per-unit nutrition (100g = grams; piece = count; other units need gramsPerUnit). */
export const foodItemUnitEnum = pgEnum('food_item_unit', [
  '100g',
  'piece',
  'liters',
  'cup',
  'tbsp',
])

export const foodItem = pgTable(
  'food_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    fdcId: integer('fdc_id').unique(),
    categoryId: text('category_id')
      .notNull()
      .references(() => foodCategory.id, { onDelete: 'restrict' }),
    calories: numeric('calories').notNull().default('0'),
    protein: numeric('protein'),
    carbs: numeric('carbs'),
    fat: numeric('fat'),
    servingSize: numeric('serving_size'),
    /** Reference unit for stored macros (per 1 unit). Default 100g = nutrition per 100g, quantity in grams. */
    unit: foodItemUnitEnum('unit').notNull().default('100g'),
    /** Grams per 1 unit. For 100g use 100; for piece required (e.g. 50 for one egg). */
    gramsPerUnit: numeric('grams_per_unit'),
    imagePublicId: text('image_public_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('food_item_category_idx').on(table.categoryId)],
)

export const foodItemRelations = relations(foodItem, ({ one }) => ({
  category: one(foodCategory, {
    fields: [foodItem.categoryId],
    references: [foodCategory.id],
  }),
}))
