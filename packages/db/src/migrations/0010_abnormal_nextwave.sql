CREATE TABLE "diet_plan_meal_consumption_item" (
	"id" text PRIMARY KEY NOT NULL,
	"diet_plan_meal_consumption_id" text NOT NULL,
	"food_item_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_plan_meal_consumption_item" ADD CONSTRAINT "diet_plan_meal_consumption_item_diet_plan_meal_consumption_id_diet_plan_meal_consumption_id_fk" FOREIGN KEY ("diet_plan_meal_consumption_id") REFERENCES "public"."diet_plan_meal_consumption"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_consumption_item" ADD CONSTRAINT "diet_plan_meal_consumption_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_plan_meal_consumption_item_consumption_idx" ON "diet_plan_meal_consumption_item" USING btree ("diet_plan_meal_consumption_id");