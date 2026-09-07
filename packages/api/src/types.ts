import type { Auth, Session } from "@absqir/auth";
import type { Database } from "@absqir/db";
import type { RequestIdVariables } from "hono/request-id";
import type { ApiBindings } from "@/bindings";

export interface AppEnv {
  Bindings: ApiBindings;
  Variables: RequestIdVariables & {
    db: Database;
    auth: Auth;
    user: Session["user"] | null;
    session: Session["session"] | null;
  };
}
