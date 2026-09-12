import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** The step a user still has to complete. `done` means the account is ready. */
export const ONBOARDING_STEPS = ["profile", "avatar", "organization", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** What a record says about one person at one event. */
export const ATTENDANCE_STATUSES = ["present", "late", "excused", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** How a record came to be. */
export const ATTENDANCE_METHODS = ["screen", "scanner", "manual", "auto"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];

/** What a notification is about. The web app renders one icon per type. */
export const NOTIFICATION_TYPES = [
  "event-reminder",
  "event-closed",
  "leave-requested",
  "leave-decided",
  "join-requested",
  "join-decided",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

import type { NotificationChannel } from "@absqir/core/notification-channel";

// The channel list lives in core so a browser island can import it without drizzle.
export {
  isNotificationChannel,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from "@absqir/core/notification-channel";

export const LEAVE_STATUSES = ["pending", "approved", "declined"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const SCHEDULE_FREQUENCIES = ["daily", "weekly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

/** Organization roles, most powerful first. Keep in sync with packages/auth/src/roles.ts. */
export const ORGANIZATION_ROLES = ["owner", "admin", "organizer", "member"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/**
 * What a verified domain opens for an account that signs up with it.
 * `closed` keeps the invitation as the only way in. `request` shows the
 * organization and asks an admin to decide. `auto` makes the account a
 * member at once.
 */
export const JOIN_POLICIES = ["closed", "request", "auto"] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];

export function isJoinPolicy(value: unknown): value is JoinPolicy {
  return typeof value === "string" && (JOIN_POLICIES as readonly string[]).includes(value);
}

/** How a domain claim was proven. */
export const DOMAIN_PROOFS = ["email", "dns"] as const;
export type DomainProof = (typeof DOMAIN_PROOFS)[number];

export const JOIN_REQUEST_STATUSES = ["pending", "approved", "declined"] as const;
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

// Tables required by Better Auth. Keep the property names in sync with the
// Better Auth field names: the Drizzle adapter looks columns up by property.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Where onboarding resumes. Set by the API, never by the client. */
  onboardingStep: text("onboarding_step").$type<OnboardingStep>().notNull().default("profile"),
  /**
   * Whether this account may start an organization. Every account may, so
   * nobody who signs up is left with nowhere to go. An operator can take it
   * away from one account.
   */
  canCreateOrganizations: boolean("can_create_organizations").notNull().default(true),
  /** Where notifications reach this person. */
  notificationChannel: text("notification_channel")
    .$type<NotificationChannel>()
    .notNull()
    .default("all"),
  /** IANA zone the account reads times in. Null follows the device. */
  timezone: text("timezone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // The devices list walks one user's sessions newest first, page by page.
  (table) => [index("session_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tables required by the Better Auth organization plugin.
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  /** What a verified domain opens. Read only after a domain is verified. */
  joinPolicy: text("join_policy").$type<JoinPolicy>().notNull().default("request"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<OrganizationRole>().notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("member_organization_user_idx").on(table.organizationId, table.userId)],
);

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A domain an organization claims, such as kolosal.ai. A new account whose
 * address ends in a verified domain finds the organization on its own,
 * which is what `organization.joinPolicy` then decides about. The claim
 * covers the whole domain and nothing under it: kolosal.ai never matches
 * mail.kolosal.ai, because a subdomain can belong to someone else.
 */
export const organizationDomain = pgTable(
  "organization_domain",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Lower case, no trailing dot. Normalized by @absqir/core/email-domain. */
    domain: text("domain").notNull().unique(),
    /** Null until the claim is proven. An unproven domain opens no door. */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by").$type<DomainProof>(),
    /** What the _absqir TXT record must carry. Kept, so a re-check can run. */
    verificationToken: text("verification_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("organization_domain_organization_idx").on(table.organizationId)],
);

/**
 * An account asks the organization that claimed its domain to let it in.
 * An approval writes a member row and a person row, the same way an accepted
 * invitation does. A decline leaves the account outside, free to ask again.
 */
export const joinRequest = pgTable(
  "join_request",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The domain that matched when the request was made. */
    domain: text("domain").notNull(),
    message: text("message"),
    status: text("status").$type<JoinRequestStatus>().notNull().default("pending"),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One open request per account per organization. A decided one stays as
    // history, and the account can ask again.
    uniqueIndex("join_request_organization_user_pending_idx")
      .on(table.organizationId, table.userId)
      .where(sql`${table.status} = 'pending'`),
    index("join_request_organization_status_idx").on(table.organizationId, table.status),
    index("join_request_user_idx").on(table.userId),
  ],
);

/**
 * The directory. A person is someone the organization expects to see:
 * an employee, a volunteer, a participant. The row can exist before the
 * person has an account (CSV import, invitation) and links to the user
 * once they accept. Membership and role live on `member`; identity lives here.
 */
export const person = pgTable(
  "person",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Null until the person accepts an invitation or registers. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    /** Employee or member number. Free text, unique inside the organization. */
    identifier: text("identifier"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("person_organization_user_idx")
      .on(table.organizationId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("person_organization_email_idx")
      .on(table.organizationId, table.email)
      .where(sql`${table.email} is not null`),
    uniqueIndex("person_organization_identifier_idx")
      .on(table.organizationId, table.identifier)
      .where(sql`${table.identifier} is not null`),
    index("person_organization_name_idx").on(table.organizationId, table.name),
  ],
);

/** A team, a division, a class, a cohort. Events expect a group to show up. */
export const group = pgTable(
  "group",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("group_organization_name_idx").on(table.organizationId, table.name)],
);

export const groupMember = pgTable(
  "group_member",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.personId] }),
    index("group_member_person_idx").on(table.personId),
  ],
);

/**
 * A rule that creates events ahead of time: every weekday at nine, every
 * Tuesday evening. Times are wall-clock in `timezone`; the events it
 * spawns carry absolute instants.
 */
export const schedule = pgTable(
  "schedule",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    frequency: text("frequency").$type<ScheduleFrequency>().notNull().default("weekly"),
    /** 0 = Sunday … 6 = Saturday. Empty for daily. */
    weekdays: integer("weekdays").array().notNull().default([]),
    /** "HH:mm" wall-clock start. */
    startTime: text("start_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    lateAfterMinutes: integer("late_after_minutes").notNull().default(15),
    opensBeforeMinutes: integer("opens_before_minutes").notNull().default(15),
    /** IANA name, for example Asia/Jakarta. */
    timezone: text("timezone").notNull(),
    /** "yyyy-MM-dd" in the schedule's timezone. */
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on"),
    active: boolean("active").notNull().default(true),
    allowWalkIns: boolean("allow_walk_ins").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("schedule_organization_idx").on(table.organizationId)],
);

export const scheduleGroup = pgTable(
  "schedule_group",
  {
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.scheduleId, table.groupId] })],
);

/**
 * One moment people are expected: a shift, a meeting, a workshop. The
 * status is derived from the timestamps, never stored:
 * closedAt set → done; openedAt set or now past startsAt → running;
 * otherwise scheduled. Closing writes an absent record for every expected
 * person without one, so reports never depend on later group changes.
 */
export const event = pgTable(
  "event",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    scheduleId: text("schedule_id").references(() => schedule.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** A check-in later than startsAt + this is late. */
    lateAfterMinutes: integer("late_after_minutes").notNull().default(15),
    /** Check-in opens this long before startsAt. */
    opensBeforeMinutes: integer("opens_before_minutes").notNull().default(15),
    /** Someone outside the expected groups may still check in. */
    allowWalkIns: boolean("allow_walk_ins").notNull().default(false),
    /** Anyone with the public link can register, and so join the organization. */
    registrationOpen: boolean("registration_open").notNull().default(false),
    /** Seats. Null means no limit. */
    registrationLimit: integer("registration_limit"),
    /** Set when an organizer opens check-in ahead of the window. */
    openedAt: timestamp("opened_at", { withTimezone: true }),
    /** Set when the event closed, by hand or by the clock. */
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** HMAC key for the rotating QR token and the member passes. Never leaves the server. */
    secret: text("secret").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_organization_starts_idx").on(table.organizationId, table.startsAt),
    uniqueIndex("event_schedule_starts_idx")
      .on(table.scheduleId, table.startsAt)
      .where(sql`${table.scheduleId} is not null`),
  ],
);

export const eventGroup = pgTable(
  "event_group",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.groupId] }),
    index("event_group_group_idx").on(table.groupId),
  ],
);

/** Someone who signed up for an open event through its public page. */
export const eventRegistration = pgTable(
  "event_registration",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.personId] }),
    index("event_registration_person_idx").on(table.personId),
  ],
);

/**
 * A member asks to be excused from an event. An approval writes an excused
 * record; a decline leaves the record alone.
 */
export const leaveRequest = pgTable(
  "leave_request",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").$type<LeaveStatus>().notNull().default("pending"),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leave_request_event_person_idx").on(table.eventId, table.personId),
    index("leave_request_organization_status_idx").on(table.organizationId, table.status),
  ],
);

/** One person at one event. Absent rows are written when the event closes. */
export const attendanceRecord = pgTable(
  "attendance_record",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    status: text("status").$type<AttendanceStatus>().notNull(),
    method: text("method").$type<AttendanceMethod>().notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    note: text("note"),
    /** The organizer who marked it by hand, when method is manual. */
    markedBy: text("marked_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_record_event_person_idx").on(table.eventId, table.personId),
    index("attendance_record_person_idx").on(table.personId),
  ],
);

/**
 * Something that happened that concerns one person: an event starts soon,
 * a leave request waits for a decision, an event closed. In-app always;
 * email as well when the instance has a mailer.
 */
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Where the notification takes the reader. */
    href: text("href"),
    /**
     * Makes a repeated write a no-op: a reminder is one row per person per
     * event per kind, however often the tick runs.
     */
    dedupeKey: text("dedupe_key"),
    /**
     * The account's choice when the row was written. An `email` row never
     * shows in the app; an `in-app` row never goes out by email. `none`
     * writes no row at all.
     */
    channel: text("channel").$type<NotificationChannel>().notNull().default("all"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notification_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("notification_user_dedupe_idx")
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
  ],
);

/**
 * Money is stored as minor units in a `bigint` column, which maps to the
 * bigint-backed Money type in `@absqir/core/money`. Never use numeric or
 * double precision for an amount.
 */
export function moneyColumn(name: string) {
  return bigint(name, { mode: "bigint" });
}
