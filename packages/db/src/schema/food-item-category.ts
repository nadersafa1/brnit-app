import { relations } from 'drizzle-orm'
import { pgTable, text, primaryKey, index } from 'drizzle-orm/pg-core'
import { foodCategory } from './food-category'
import { foodItem } from './food-item-table'

export const foodItemCategory = pgTable(
  'food_item_category',
  {
    foodItemId: text('food_item_id')
      .notNull()
      .references(() => foodItem.id, { onDelete: 'cascade' }),
    foodCategoryId: text('food_category_id')
      .notNull()
      .references(() => foodCategory.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.foodItemId, t.foodCategoryId] }),
    index('food_item_category_category_idx').on(t.foodCategoryId),
  ],
)

export const foodItemCategoryRelations = relations(foodItemCategory, ({ one }) => ({
  foodItem: one(foodItem, {
    fields: [foodItemCategory.foodItemId],
    references: [foodItem.id],
  }),
  category: one(foodCategory, {
    fields: [foodItemCategory.foodCategoryId],
    references: [foodCategory.id],
  }),
}))
