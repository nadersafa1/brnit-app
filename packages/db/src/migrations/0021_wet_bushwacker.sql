CREATE TABLE "food_item_category" (
	"food_item_id" text NOT NULL,
	"food_category_id" text NOT NULL,
	CONSTRAINT "food_item_category_food_item_id_food_category_id_pk" PRIMARY KEY("food_item_id","food_category_id")
);
--> statement-breakpoint
ALTER TABLE "food_item" DROP CONSTRAINT "food_item_fdc_id_unique";--> statement-breakpoint
ALTER TABLE "food_item" DROP CONSTRAINT "food_item_category_id_food_category_id_fk";
--> statement-breakpoint
DROP INDEX "food_item_category_idx";--> statement-breakpoint
ALTER TABLE "food_category" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "food_item_category" ADD CONSTRAINT "food_item_category_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_item_category" ADD CONSTRAINT "food_item_category_food_category_id_food_category_id_fk" FOREIGN KEY ("food_category_id") REFERENCES "public"."food_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_item_category_category_idx" ON "food_item_category" USING btree ("food_category_id");--> statement-breakpoint
ALTER TABLE "food_item" DROP COLUMN "fdc_id";--> statement-breakpoint
ALTER TABLE "food_item" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "food_item" DROP COLUMN "serving_size";