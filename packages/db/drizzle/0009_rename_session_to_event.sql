-- The word "session" meant two things: a login session and a moment people
-- attend. The second one is now an event. The login session keeps its name.
ALTER TABLE "attendance_session" RENAME TO "event";--> statement-breakpoint
ALTER TABLE "session_group" RENAME TO "event_group";--> statement-breakpoint
ALTER TABLE "session_registration" RENAME TO "event_registration";--> statement-breakpoint

ALTER TABLE "event_group" RENAME COLUMN "session_id" TO "event_id";--> statement-breakpoint
ALTER TABLE "event_registration" RENAME COLUMN "session_id" TO "event_id";--> statement-breakpoint
ALTER TABLE "leave_request" RENAME COLUMN "session_id" TO "event_id";--> statement-breakpoint
ALTER TABLE "attendance_record" RENAME COLUMN "session_id" TO "event_id";--> statement-breakpoint

-- Postgres keeps the old index and constraint names after a table rename.
ALTER INDEX "attendance_session_organization_starts_idx" RENAME TO "event_organization_starts_idx";--> statement-breakpoint
ALTER INDEX "attendance_session_schedule_starts_idx" RENAME TO "event_schedule_starts_idx";--> statement-breakpoint
ALTER INDEX "session_group_group_idx" RENAME TO "event_group_group_idx";--> statement-breakpoint
ALTER INDEX "session_registration_person_idx" RENAME TO "event_registration_person_idx";--> statement-breakpoint
ALTER INDEX "attendance_record_session_person_idx" RENAME TO "attendance_record_event_person_idx";--> statement-breakpoint
ALTER INDEX "leave_request_session_person_idx" RENAME TO "leave_request_event_person_idx";--> statement-breakpoint

ALTER TABLE "event" RENAME CONSTRAINT "attendance_session_pkey" TO "event_pkey";--> statement-breakpoint
ALTER TABLE "event" RENAME CONSTRAINT "attendance_session_organization_id_organization_id_fk" TO "event_organization_id_organization_id_fk";--> statement-breakpoint
ALTER TABLE "event" RENAME CONSTRAINT "attendance_session_schedule_id_schedule_id_fk" TO "event_schedule_id_schedule_id_fk";--> statement-breakpoint
ALTER TABLE "event" RENAME CONSTRAINT "attendance_session_created_by_user_id_fk" TO "event_created_by_user_id_fk";--> statement-breakpoint

ALTER TABLE "event_group" RENAME CONSTRAINT "session_group_session_id_group_id_pk" TO "event_group_event_id_group_id_pk";--> statement-breakpoint
ALTER TABLE "event_group" RENAME CONSTRAINT "session_group_session_id_attendance_session_id_fk" TO "event_group_event_id_event_id_fk";--> statement-breakpoint
ALTER TABLE "event_group" RENAME CONSTRAINT "session_group_group_id_group_id_fk" TO "event_group_group_id_group_id_fk";--> statement-breakpoint

ALTER TABLE "event_registration" RENAME CONSTRAINT "session_registration_session_id_person_id_pk" TO "event_registration_event_id_person_id_pk";--> statement-breakpoint
ALTER TABLE "event_registration" RENAME CONSTRAINT "session_registration_session_id_attendance_session_id_fk" TO "event_registration_event_id_event_id_fk";--> statement-breakpoint
ALTER TABLE "event_registration" RENAME CONSTRAINT "session_registration_person_id_person_id_fk" TO "event_registration_person_id_person_id_fk";--> statement-breakpoint

ALTER TABLE "leave_request" RENAME CONSTRAINT "leave_request_session_id_attendance_session_id_fk" TO "leave_request_event_id_event_id_fk";--> statement-breakpoint
ALTER TABLE "attendance_record" RENAME CONSTRAINT "attendance_record_session_id_attendance_session_id_fk" TO "attendance_record_event_id_event_id_fk";--> statement-breakpoint

-- Rows written before the rename still say "session". Bring them across so old
-- notifications keep their icon, their link, and their duplicate guard.
UPDATE "notification" SET "type" = 'event-reminder' WHERE "type" = 'session-reminder';--> statement-breakpoint
UPDATE "notification" SET "type" = 'event-closed' WHERE "type" = 'session-closed';--> statement-breakpoint
UPDATE "notification" SET "dedupe_key" = 'event-reminder' || substring("dedupe_key" from 17) WHERE "dedupe_key" LIKE 'session-reminder:%';--> statement-breakpoint
UPDATE "notification" SET "dedupe_key" = 'event-closed' || substring("dedupe_key" from 15) WHERE "dedupe_key" LIKE 'session-closed:%';--> statement-breakpoint
UPDATE "notification" SET "href" = '/my/events' WHERE "href" = '/my/sessions';--> statement-breakpoint
UPDATE "notification" SET "href" = '/events/' || substring("href" from 11) WHERE "href" LIKE '/sessions/%';
