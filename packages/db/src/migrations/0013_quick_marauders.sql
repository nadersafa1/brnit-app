CREATE TYPE "public"."food_item_unit" AS ENUM('100g', 'piece');--> statement-breakpoint
ALTER TABLE "food_item" ADD COLUMN "unit" "food_item_unit" DEFAULT '100g' NOT NULL;--> statement-breakpoint
ALTER TABLE "food_item" ADD COLUMN "grams_per_unit" numeric;