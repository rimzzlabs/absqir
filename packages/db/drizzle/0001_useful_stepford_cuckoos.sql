CREATE TABLE "attendance_record" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"person_id" text NOT NULL,
	"status" text NOT NULL,
	"method" text NOT NULL,
	"checked_in_at" timestamp with time zone,
	"note" text,
	"marked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"schedule_id" text,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"late_after_minutes" integer DEFAULT 15 NOT NULL,
	"opens_before_minutes" integer DEFAULT 15 NOT NULL,
	"allow_walk_ins" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"secret" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"weekdays" integer[] DEFAULT '{}' NOT NULL,
	"start_time" text NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"late_after_minutes" integer DEFAULT 15 NOT NULL,
	"opens_before_minutes" integer DEFAULT 15 NOT NULL,
	"timezone" text NOT NULL,
	"starts_on" text NOT NULL,
	"ends_on" text,
	"active" boolean DEFAULT true NOT NULL,
	"allow_walk_ins" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_group" (
	"schedule_id" text NOT NULL,
	"group_id" text NOT NULL,
	CONSTRAINT "schedule_group_schedule_id_group_id_pk" PRIMARY KEY("schedule_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "session_group" (
	"session_id" text NOT NULL,
	"group_id" text NOT NULL,
	CONSTRAINT "session_group_session_id_group_id_pk" PRIMARY KEY("session_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_session_id_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_marked_by_user_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_group" ADD CONSTRAINT "schedule_group_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_group" ADD CONSTRAINT "schedule_group_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_group" ADD CONSTRAINT "session_group_session_id_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_group" ADD CONSTRAINT "session_group_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_record_session_person_idx" ON "attendance_record" USING btree ("session_id","person_id");--> statement-breakpoint
CREATE INDEX "attendance_record_person_idx" ON "attendance_record" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "attendance_session_organization_starts_idx" ON "attendance_session" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_session_schedule_starts_idx" ON "attendance_session" USING btree ("schedule_id","starts_at") WHERE "attendance_session"."schedule_id" is not null;--> statement-breakpoint
CREATE INDEX "schedule_organization_idx" ON "schedule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "session_group_group_idx" ON "session_group" USING btree ("group_id");