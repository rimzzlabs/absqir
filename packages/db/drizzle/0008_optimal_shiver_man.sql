ALTER TABLE "user" ALTER COLUMN "can_create_organizations" SET DEFAULT true;
--> statement-breakpoint
-- The gate is gone: every account that already exists may start an organization too.
UPDATE "user" SET "can_create_organizations" = true;
