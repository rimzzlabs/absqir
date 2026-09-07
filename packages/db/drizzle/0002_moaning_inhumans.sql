ALTER TABLE "attendance_record" ALTER COLUMN "checked_in_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_record" ALTER COLUMN "checked_in_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "attendance_session" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_session" ALTER COLUMN "created_at" SET DEFAULT now();