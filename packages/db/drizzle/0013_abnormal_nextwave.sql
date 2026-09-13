ALTER TABLE "notification" ADD COLUMN "title_key" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "title_params" jsonb;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "body_key" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "body_params" jsonb;