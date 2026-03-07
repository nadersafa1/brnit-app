CREATE TABLE "diet_plan_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"user_id" text,
	"diet_plan_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "diet_plan_assignment_assignee_check" CHECK ((("diet_plan_assignment"."member_id" IS NOT NULL AND "diet_plan_assignment"."user_id" IS NULL) OR ("diet_plan_assignment"."member_id" IS NULL AND "diet_plan_assignment"."user_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "diet_plan_meal_consumption" (
	"id" text PRIMARY KEY NOT NULL,
	"diet_plan_assignment_id" text NOT NULL,
	"diet_plan_meal_id" text NOT NULL,
	"consumed_at" timestamp NOT NULL,
	"consumed_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_plan_assignment" ADD CONSTRAINT "diet_plan_assignment_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_assignment" ADD CONSTRAINT "diet_plan_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_assignment" ADD CONSTRAINT "diet_plan_assignment_diet_plan_id_diet_plan_id_fk" FOREIGN KEY ("diet_plan_id") REFERENCES "public"."diet_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_consumption" ADD CONSTRAINT "diet_plan_meal_consumption_diet_plan_assignment_id_diet_plan_assignment_id_fk" FOREIGN KEY ("diet_plan_assignment_id") REFERENCES "public"."diet_plan_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_plan_meal_consumption" ADD CONSTRAINT "diet_plan_meal_consumption_diet_plan_meal_id_diet_plan_meal_id_fk" FOREIGN KEY ("diet_plan_meal_id") REFERENCES "public"."diet_plan_meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_plan_assignment_member_idx" ON "diet_plan_assignment" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "diet_plan_assignment_user_idx" ON "diet_plan_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "diet_plan_assignment_plan_idx" ON "diet_plan_assignment" USING btree ("diet_plan_id");--> statement-breakpoint
CREATE INDEX "diet_plan_meal_consumption_assignment_idx" ON "diet_plan_meal_consumption" USING btree ("diet_plan_assignment_id");--> statement-breakpoint
CREATE INDEX "diet_plan_meal_consumption_meal_idx" ON "diet_plan_meal_consumption" USING btree ("diet_plan_meal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diet_plan_meal_consumption_unique_idx" ON "diet_plan_meal_consumption" USING btree ("diet_plan_assignment_id","diet_plan_meal_id","consumed_date");--> statement-breakpoint
ALTER TABLE "diet_plan" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "diet_plan" DROP COLUMN "end_date";