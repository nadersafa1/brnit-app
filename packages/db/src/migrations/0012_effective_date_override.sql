ALTER TABLE "diet_plan_meal_item_override" ADD COLUMN "effective_date" date;
--> statement-breakpoint
DROP INDEX IF EXISTS "diet_plan_meal_item_override_unique_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "diet_plan_meal_item_override_unique_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","meal_item_id","effective_date");
