CREATE TABLE "check_in_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	"outcome" text NOT NULL,
	"method" text NOT NULL,
	"location_verdict" text,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy_meters" double precision,
	"distance_meters" integer,
	"fix_count" integer DEFAULT 0 NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"risk_reasons" text[] DEFAULT '{}' NOT NULL,
	"network_latitude" double precision,
	"network_longitude" double precision,
	"network_asn" integer,
	"network_organization" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_meters" integer DEFAULT 150 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "accuracy_meters" double precision;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "distance_meters" integer;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "location_verdict" text;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "risk_score" integer;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "risk_reasons" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "require_location" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "radius_meters" integer;--> statement-breakpoint
ALTER TABLE "schedule" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "schedule" ADD COLUMN "require_location" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "check_in_attempt" ADD CONSTRAINT "check_in_attempt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_attempt" ADD CONSTRAINT "check_in_attempt_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_attempt" ADD CONSTRAINT "check_in_attempt_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_in_attempt_event_idx" ON "check_in_attempt" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "check_in_attempt_person_idx" ON "check_in_attempt" USING btree ("person_id","created_at");--> statement-breakpoint
CREATE INDEX "check_in_attempt_organization_idx" ON "check_in_attempt" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "location_organization_name_idx" ON "location" USING btree ("organization_id","name");--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_record_event_risk_idx" ON "attendance_record" USING btree ("event_id","risk_score") WHERE "attendance_record"."risk_score" is not null;--> statement-breakpoint
CREATE INDEX "event_location_idx" ON "event" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "schedule_location_idx" ON "schedule" USING btree ("location_id");