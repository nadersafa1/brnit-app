ALTER TABLE "diet_plan_assignment" DROP CONSTRAINT "diet_plan_assignment_diet_plan_id_diet_plan_id_fk";
--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "calories" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "calories" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "diet_plan_assignment" ADD CONSTRAINT "diet_plan_assignment_diet_plan_id_diet_plan_id_fk" FOREIGN KEY ("diet_plan_id") REFERENCES "public"."diet_plan"("id") ON DELETE restrict ON UPDATE no action;