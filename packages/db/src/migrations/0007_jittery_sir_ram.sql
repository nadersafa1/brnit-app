ALTER TABLE "body_composition_assessment" ADD COLUMN "image_public_id" text;--> statement-breakpoint
ALTER TABLE "body_composition_assessment" DROP COLUMN "image_url";