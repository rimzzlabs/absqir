import type { MySession } from "@/queries/use-my";

/** When check-in opens: the start, less the opening margin. */
export function opensAtOf(session: MySession): Date {
  return new Date(new Date(session.startsAt).getTime() - session.opensBeforeMinutes * 60_000);
}
