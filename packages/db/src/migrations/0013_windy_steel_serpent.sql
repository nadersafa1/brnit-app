CREATE TYPE "public"."food_item_unit" AS ENUM('100g', 'piece');--> statement-breakpoint
DROP INDEX "diet_plan_meal_item_override_unique_idx";--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD COLUMN "effective_date" date;--> statement-breakpoint
ALTER TABLE "food_item" ADD COLUMN "unit" "food_item_unit" DEFAULT '100g' NOT NULL;--> statement-breakpoint
ALTER TABLE "food_item" ADD COLUMN "grams_per_unit" numeric;--> statement-breakpoint
CREATE UNIQUE INDEX "diet_plan_meal_item_override_unique_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","meal_item_id","effective_date");