import { account } from "#src/messages/en/account";
import { auth } from "#src/messages/en/auth";
import { calendar } from "#src/messages/en/calendar";
import { checkin } from "#src/messages/en/checkin";
import { common } from "#src/messages/en/common";
import { email } from "#src/messages/en/email";
import { errors } from "#src/messages/en/errors";
import { events } from "#src/messages/en/events";
import { groups } from "#src/messages/en/groups";
import { home } from "#src/messages/en/home";
import { invite } from "#src/messages/en/invite";
import { join } from "#src/messages/en/join";
import { leave } from "#src/messages/en/leave";
import { my } from "#src/messages/en/my";
import { notifications } from "#src/messages/en/notifications";
import { onboarding } from "#src/messages/en/onboarding";
import { publicEvent } from "#src/messages/en/public-event";
import { reports } from "#src/messages/en/reports";
import { schedules } from "#src/messages/en/schedules";
import { settings } from "#src/messages/en/settings";
import { shell } from "#src/messages/en/shell";

/** English carries every key. A message missing from another language falls back to this one. */
export const en = {
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
