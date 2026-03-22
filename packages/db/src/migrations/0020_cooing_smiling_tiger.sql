ALTER TABLE "diet_plan_meal_consumption_item" DROP CONSTRAINT "diet_plan_meal_consumption_item_food_item_id_food_item_id_fk";
--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" DROP CONSTRAINT "diet_plan_meal_item_override_food_item_id_food_item_id_fk";
--> statement-breakpoint
ALTER TABLE "meal_item" DROP CONSTRAINT "meal_item_food_item_id_food_item_id_fk";
--> statement-breakpoint
ALTER TABLE "diet_plan_meal_consumption_item" ADD CONSTRAINT "diet_plan_meal_consumption_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE restrict;