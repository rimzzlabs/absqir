ALTER TABLE "notification" ADD COLUMN "channel" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notification_channel" text DEFAULT 'all' NOT NULL;