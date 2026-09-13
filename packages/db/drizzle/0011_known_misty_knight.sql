CREATE TABLE "check_in_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	"attempt_id" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_in_report" ADD CONSTRAINT "check_in_report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_report" ADD CONSTRAINT "check_in_report_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_report" ADD CONSTRAINT "check_in_report_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_report" ADD CONSTRAINT "check_in_report_attempt_id_check_in_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."check_in_attempt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_report" ADD CONSTRAINT "check_in_report_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_report_event_person_idx" ON "check_in_report" USING btree ("event_id","person_id");--> statement-breakpoint
CREATE INDEX "check_in_report_organization_status_idx" ON "check_in_report" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "check_in_report_person_idx" ON "check_in_report" USING btree ("person_id");