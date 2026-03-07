CREATE TABLE "body_composition_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"assessed_at" timestamp NOT NULL,
	"recorded_by_id" text NOT NULL,
	"height_cm" numeric(5, 2) NOT NULL,
	"body_fat_percent" numeric(5, 2) NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"bmi" numeric(4, 2) NOT NULL,
	"muscle_mass_kg" numeric(5, 2) NOT NULL,
	"visceral_fat_area_cm2" numeric(6, 2) NOT NULL,
	"body_water_l" numeric(5, 2) NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_composition_assessment" ADD CONSTRAINT "body_composition_assessment_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_composition_assessment" ADD CONSTRAINT "body_composition_assessment_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_composition_assessment_member_idx" ON "body_composition_assessment" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "body_composition_assessment_assessed_at_idx" ON "body_composition_assessment" USING btree ("assessed_at");--> statement-breakpoint
CREATE INDEX "body_composition_assessment_recorded_by_idx" ON "body_composition_assessment" USING btree ("recorded_by_id");