CREATE TABLE "app_version_config" (
	"platform" text PRIMARY KEY NOT NULL,
	"min_version" text NOT NULL,
	"latest_version" text NOT NULL,
	"message" text NOT NULL,
	"store_url" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
