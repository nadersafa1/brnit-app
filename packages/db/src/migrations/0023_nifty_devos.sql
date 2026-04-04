-- Idempotent where possible: supports DBs that partially applied an earlier 0023 attempt
-- or were fixed manually (columns/indexes may already exist).
DROP INDEX IF EXISTS "diet_plan_meal_item_override_unique_idx";--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD COLUMN IF NOT EXISTS "intent_scope" text;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD COLUMN IF NOT EXISTS "intent_start_date" date;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD COLUMN IF NOT EXISTS "effective_dates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diet_plan_meal_item_override_slot_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","meal_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "diet_plan_meal_item_override_slot_food_item_unique_idx" ON "diet_plan_meal_item_override" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","meal_item_id","food_item_id");--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" DROP COLUMN IF EXISTS "effective_date";--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" DROP CONSTRAINT IF EXISTS "diet_plan_meal_item_override_intent_scope_check";--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_intent_scope_check" CHECK (
        (
          "diet_plan_meal_item_override"."intent_scope" IS NULL
          AND "diet_plan_meal_item_override"."intent_start_date" IS NULL
        )
        OR (
          "diet_plan_meal_item_override"."intent_scope" = 'single_day'
          AND "diet_plan_meal_item_override"."intent_start_date" IS NOT NULL
        )
        OR (
          "diet_plan_meal_item_override"."intent_scope" = 'rest_of_plan'
          AND "diet_plan_meal_item_override"."intent_start_date" IS NOT NULL
        )
      );--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" DROP CONSTRAINT IF EXISTS "diet_plan_meal_item_override_effective_dates_array_check";--> statement-breakpoint
ALTER TABLE "diet_plan_meal_item_override" ADD CONSTRAINT "diet_plan_meal_item_override_effective_dates_array_check" CHECK (jsonb_typeof("diet_plan_meal_item_override"."effective_dates") = 'array');
