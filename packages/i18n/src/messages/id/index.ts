import { account } from "#src/messages/id/account";
import { auth } from "#src/messages/id/auth";
import { calendar } from "#src/messages/id/calendar";
import { checkin } from "#src/messages/id/checkin";
import { common } from "#src/messages/id/common";
import { email } from "#src/messages/id/email";
import { errors } from "#src/messages/id/errors";
import { events } from "#src/messages/id/events";
import { groups } from "#src/messages/id/groups";
import { home } from "#src/messages/id/home";
import { invite } from "#src/messages/id/invite";
import { join } from "#src/messages/id/join";
import { leave } from "#src/messages/id/leave";
import { my } from "#src/messages/id/my";
import { notifications } from "#src/messages/id/notifications";
import { onboarding } from "#src/messages/id/onboarding";
import { organization } from "#src/messages/id/organization";
import { publicEvent } from "#src/messages/id/public-event";
import { reports } from "#src/messages/id/reports";
import { schedules } from "#src/messages/id/schedules";
import { settings } from "#src/messages/id/settings";
import { shell } from "#src/messages/id/shell";

/** Bahasa Indonesia. Every key mirrors the English catalog, so nothing falls through. */
export const id = {
  common,
  shell,
  auth,
  onboarding,
  join,
  home,
  events,
  checkin,
  calendar,
  reports,
  schedules,
  groups,
  organization,
  settings,
  account,
  notifications,
  my,
  invite,
  leave,
  publicEvent,
  email,
  errors,
} as const;
