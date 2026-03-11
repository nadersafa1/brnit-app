CREATE TABLE "diet_plan_meal_item_override" (
	"id" text PRIMARY KEY NOT NULL,
	"diet_plan_assignment_id" text NOT NULL,
	"diet_plan_meal_id" text NOT NULL,
	"meal_item_id" text NOT NULL,
	"food_item_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_diet_plan_assignment_id_diet_plan_assignment_id_fk" FOREIGN KEY ("diet_plan_assignment_id") REFERENCES "public"."diet_plan_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_diet_plan_meal_id_diet_plan_meal_id_fk" FOREIGN KEY ("diet_plan_meal_id") REFERENCES "public"."diet_plan_meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_meal_item_id_meal_item_id_fk" FOREIGN KEY ("meal_item_id") REFERENCES "public"."meal_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_plan_meal_item_override_assignment_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id");--> statement-breakpoint
CREATE INDEX "diet_plan_meal_item_override_assignment_meal_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diet_plan_meal_item_override_unique_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","meal_item_id");