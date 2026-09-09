CREATE TABLE "join_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"domain" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain" text NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"verification_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_domain_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "join_policy" text DEFAULT 'request' NOT NULL;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_request" ADD CONSTRAINT "join_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_domain" ADD CONSTRAINT "organization_domain_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "join_request_organization_user_pending_idx" ON "join_request" USING btree ("organization_id","user_id") WHERE "join_request"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "join_request_organization_status_idx" ON "join_request" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "join_request_user_idx" ON "join_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_domain_organization_idx" ON "organization_domain" USING btree ("organization_id");