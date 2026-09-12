import type { MyEvent } from "@/queries/use-my";

/** When check-in opens: the start, less the opening margin. */
export function opensAtOf(event: MyEvent): Date {
  return new Date(new Date(event.startsAt).getTime() - event.opensBeforeMinutes * 60_000);
}
