import type { Auth, RoleName, Session } from "@absqir/auth";
import type { Database } from "@absqir/db";
import type { Mailer } from "@absqir/transactional";
import type { RequestIdVariables } from "hono/request-id";
import type { ApiBindings } from "#src/bindings";

export interface AppEnv {
  Bindings: ApiBindings;
  Variables: RequestIdVariables & {
    db: Database;
    auth: Auth;
    /** Null when the instance sends no email. */
    mailer: Mailer | null;
    user: Session["user"] | null;
    session: Session["session"] | null;
    /** Set by organizationGuard after it proves membership. */
    organizationId?: string;
    /** The caller's role in that organization. */
    role?: RoleName;
  };
}
