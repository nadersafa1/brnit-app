import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core'
import { foodCategory } from './food-category'

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
    calories: numeric('calories'),
    protein: numeric('protein'),
    carbs: numeric('carbs'),
    fat: numeric('fat'),
    servingSize: numeric('serving_size'),
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
