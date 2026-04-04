UPDATE "food_item" SET "protein" = '0' WHERE "protein" IS NULL;--> statement-breakpoint
UPDATE "food_item" SET "carbs" = '0' WHERE "carbs" IS NULL;--> statement-breakpoint
UPDATE "food_item" SET "fat" = '0' WHERE "fat" IS NULL;--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "protein" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "protein" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "carbs" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "carbs" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "fat" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "food_item" ALTER COLUMN "fat" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meal" ADD COLUMN "total_calories" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal" ADD COLUMN "total_protein" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal" ADD COLUMN "total_carbs" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal" ADD COLUMN "total_fat" numeric DEFAULT '0' NOT NULL;