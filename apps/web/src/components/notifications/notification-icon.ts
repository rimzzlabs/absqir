import {
  CheckCircleIcon,
  type Icon,
  NotePencilIcon,
  QrCodeIcon,
  SealCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import type { Notification } from "@/queries/use-notifications";

/** One icon per kind, shared by the page and the header card. */
export const NOTIFICATION_ICONS: Record<Notification["type"], Icon> = {
  "event-reminder": QrCodeIcon,
  "event-closed": SealCheckIcon,
  "leave-requested": NotePencilIcon,
  "leave-decided": CheckCircleIcon,
  "join-requested": UserPlusIcon,
  "join-decided": UserCheckIcon,
};
