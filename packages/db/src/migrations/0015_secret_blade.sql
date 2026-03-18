CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text,
	"user_role" text,
	"organization_id" text,
	"member_id" text,
	"action_name" text NOT NULL,
	"resource" text,
	"endpoint" text,
	"request_method" text NOT NULL,
	"status_code" integer NOT NULL,
	"success" boolean NOT NULL,
	"ip" text,
	"user_agent" text,
	"duration_ms" integer,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_requestId_idx" ON "audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_log_userId_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_organizationId_idx" ON "audit_log" USING btree ("organization_id");