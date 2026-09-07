import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { match, P } from "ts-pattern";
import { csrfPolicy, payloadLimit, rateLimit, securityHeaders } from "@/middleware/security";
import { currentSession, requestContext } from "@/middleware/session";
import { attendanceSessionRoutes } from "@/routes/attendance-sessions";
import { authRoutes } from "@/routes/auth";
import { checkInRoutes } from "@/routes/check-in";
import { mountDocs } from "@/routes/docs";
import { healthRoutes } from "@/routes/health";
import { meRoutes } from "@/routes/me";
import type { AppEnv } from "@/types";

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation failed", issues: result.error.issues }, 422);
    }
  },
}).basePath("/api");

app.use("*", requestId());
app.use("*", securityHeaders());
app.use("*", csrfPolicy());
app.use("*", payloadLimit());
app.use("*", rateLimit());
app.use("*", requestContext());
app.use("*", currentSession());

const routes = app
  .route("/", authRoutes)
  .route("/", healthRoutes)
  .route("/", meRoutes)
  .route("/", attendanceSessionRoutes)
  .route("/", checkInRoutes);

mountDocs(app);

app.onError((error, c) => {
  const requestId = c.get("requestId");

  return match(error)
    .with(P.instanceOf(HTTPException), (known) => known.getResponse())
    .otherwise((unknown) => {
      console.error({ requestId, error: unknown });

      // The message can carry a connection string or a query, so it never ships.
      return c.json({ error: "Internal server error", requestId }, 500);
    });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export { app };
export type AppType = typeof routes;
