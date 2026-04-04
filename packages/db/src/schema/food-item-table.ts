import { pgEnum, pgTable, text, timestamp, numeric } from 'drizzle-orm/pg-core'

/** Unit for food quantity and per-unit nutrition (100g = grams; piece = count; other units need gramsPerUnit). */
export const foodItemUnitEnum = pgEnum('food_item_unit', [
  '100g',
  'piece',
  'liters',
  'cup',
  'tbsp',
])

export const foodItem = pgTable('food_item', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  calories: numeric('calories').notNull().default('0'),
  protein: numeric('protein').notNull().default('0'),
  carbs: numeric('carbs').notNull().default('0'),
  fat: numeric('fat').notNull().default('0'),
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
})
