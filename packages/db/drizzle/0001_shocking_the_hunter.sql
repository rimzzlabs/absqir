CREATE TABLE "attendance_record" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"identifier" text NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_session" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"secret" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_session_id_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_record_session_identifier_idx" ON "attendance_record" USING btree ("session_id","identifier");