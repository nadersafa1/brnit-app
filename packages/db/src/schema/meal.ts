import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { foodItem } from "./food-item";

export const meal = pgTable("meal", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	description: text("description"),
	totalCalories: numeric("total_calories").notNull().default("0"),
	totalProtein: numeric("total_protein").notNull().default("0"),
	totalCarbs: numeric("total_carbs").notNull().default("0"),
	totalFat: numeric("total_fat").notNull().default("0"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const mealItem = pgTable(
	"meal_item",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		mealId: text("meal_id")
			.notNull()
			.references(() => meal.id, { onDelete: "cascade" }),
		foodItemId: text("food_item_id")
			.notNull()
			.references(() => foodItem.id, {
				onDelete: "restrict",
				onUpdate: "restrict",
			}),
		quantity: numeric("quantity").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("meal_item_meal_idx").on(table.mealId),
		index("meal_item_food_idx").on(table.foodItemId),
	]
);

export const mealRelations = relations(meal, ({ many }) => ({
	mealItems: many(mealItem),
}));

export const mealItemRelations = relations(mealItem, ({ one }) => ({
	meal: one(meal, {
		fields: [mealItem.mealId],
		references: [meal.id],
	}),
	foodItem: one(foodItem, {
		fields: [mealItem.foodItemId],
		references: [foodItem.id],
	}),
}));
