import { relations } from 'drizzle-orm'
import { foodItemCategory } from './food-item-category'
import { foodItem } from './food-item-table'

export { foodItem, foodItemUnitEnum } from './food-item-table'
export { foodItemCategory, foodItemCategoryRelations } from './food-item-category'

export const foodItemRelations = relations(foodItem, ({ many }) => ({
  foodItemCategories: many(foodItemCategory),
}))
