CREATE TABLE "diet_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_plan_meal" (
	"id" text PRIMARY KEY NOT NULL,
	"diet_plan_id" text NOT NULL,
	"meal_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"meal_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "food_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "food_item" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fdc_id" integer,
	"category_id" text NOT NULL,
	"calories" numeric,
	"protein" numeric,
	"carbs" numeric,
	"fat" numeric,
	"serving_size" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "food_item_fdc_id_unique" UNIQUE("fdc_id")
);
--> statement-breakpoint
CREATE TABLE "meal" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_item" (
	"id" text PRIMARY KEY NOT NULL,
	"meal_id" text NOT NULL,
	"food_item_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_plan_meal" ADD CONSTRAINT "diet_plan_meal_diet_plan_id_diet_plan_id_fk" FOREIGN KEY ("diet_plan_id") REFERENCES "public"."diet_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_item" ADD CONSTRAINT "food_item_category_id_food_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."food_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_meal_id_meal_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_food_item_id_food_item_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_plan_meal_plan_idx" ON "diet_plan_meal" USING btree ("diet_plan_id");--> statement-breakpoint
CREATE INDEX "diet_plan_meal_day_idx" ON "diet_plan_meal" USING btree ("diet_plan_id","day_number");--> statement-breakpoint
CREATE INDEX "food_item_category_idx" ON "food_item" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "meal_item_meal_idx" ON "meal_item" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_item_food_idx" ON "meal_item" USING btree ("food_item_id");