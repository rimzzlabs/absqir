import type { Database } from "@absqir/db";
import { schema } from "@absqir/db";
import type { Mailer } from "@absqir/transactional";
import type { ApiBindings } from "@/bindings";
import { createMailerFor } from "@/context";
import { parseEnv } from "@/env";
import { emailNotifications } from "@/lib/notifications";
import { notifyDueReminders } from "@/lib/notify";
import { settle } from "@/lib/sessions";

const { organization } = schema;

export interface TickOptions {
  mailer?: Mailer | null;
  /** Where the links in a reminder email point. */
  origin: string;
  now?: Date;
}

export interface TickResult {
  organizations: number;
  notifications: number;
}

/**
 * The heartbeat: spawn the sessions the schedules owe, close the ones the
 * clock ended, and send the reminders that fell due, for every organization.
 * Reading a page settles one organization already, so this only makes the
 * work eager, and the reminders arrive without anyone looking.
 */
export async function runTick(db: Database, options: TickOptions): Promise<TickResult> {
  const now = options.now ?? new Date();

  const organizations = await db.select({ id: organization.id }).from(organization);
  let notifications = 0;

  for (const row of organizations) {
    try {
      await settle(db, row.id, now);

      const created = await notifyDueReminders(db, row.id, now);
      notifications += created.length;

      await emailNotifications(db, options.mailer ?? null, options.origin, created);
    } catch (error) {
      // One broken organization must not stop the others.
      console.error({ message: "tick failed", organizationId: row.id, error });
    }
  }

  return { organizations: organizations.length, notifications };
}

/** How often the in-process ticker runs on a Node self-host. */
export const TICK_INTERVAL_MS = 60_000;

export interface TickerOptions extends TickOptions {
  intervalMs?: number;
}

/**
 * Runs the tick on a timer inside one Node process. Workers cannot hold a
 * timer between requests, so they call POST /api/tick from a Cron Trigger
 * instead. Returns the function that stops it.
 */
export function startTicker(db: Database, options: TickerOptions): () => void {
  const intervalMs = options.intervalMs ?? TICK_INTERVAL_MS;
  let running = false;

  const timer = setInterval(() => {
    // A slow tick must never overlap the next one.
    if (running) return;
    running = true;

    runTick(db, options)
      .catch((error: unknown) => console.error({ message: "ticker failed", error }))
      .finally(() => {
        running = false;
      });
  }, intervalMs);

  // The timer must never hold the process open on its own.
  timer.unref?.();

  return () => clearInterval(timer);
}

/** The default origin for a self-host that never set APP_URL. */
const LOCAL_ORIGIN = "http://localhost:4321";

/**
 * Starts the ticker from the bindings the platform already built, so the
 * Node runtime does not repeat how a mailer is made.
 */
export function startTickerFor(bindings: ApiBindings, db: Database): () => void {
  const env = parseEnv(bindings);
  const origin = env.APP_URL ?? LOCAL_ORIGIN;

  return startTicker(db, { mailer: createMailerFor(env, origin), origin });
}
