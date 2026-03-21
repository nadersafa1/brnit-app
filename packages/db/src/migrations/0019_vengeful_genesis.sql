CREATE TABLE "diet_plan_meal_time_override" (
	"id" text PRIMARY KEY NOT NULL,
	"diet_plan_assignment_id" text NOT NULL,
	"diet_plan_meal_id" text NOT NULL,
	"scheduled_time" text NOT NULL,
	"effective_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_plan_meal" ADD COLUMN "scheduled_time" text;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_time_override" ADD CONSTRAINT "diet_plan_meal_time_override_diet_plan_assignment_id_diet_plan_assignment_id_fk" FOREIGN KEY ("diet_plan_assignment_id") REFERENCES "public"."diet_plan_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_time_override" ADD CONSTRAINT "diet_plan_meal_time_override_diet_plan_meal_id_diet_plan_meal_id_fk" FOREIGN KEY ("diet_plan_meal_id") REFERENCES "public"."diet_plan_meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_plan_meal_time_override_assignment_idx" ON "diet_plan_meal_time_override" USING btree ("diet_plan_assignment_id");--> statement-breakpoint
CREATE INDEX "diet_plan_meal_time_override_assignment_meal_idx" ON "diet_plan_meal_time_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diet_plan_meal_time_override_unique_idx" ON "diet_plan_meal_time_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","effective_date");