import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { match, P } from "ts-pattern";
import { csrfPolicy, payloadLimit, rateLimit, securityHeaders } from "@/middleware/security";
import { currentSession, requestContext } from "@/middleware/session";
import { authRoutes } from "@/routes/auth";
import { authFlowRoutes } from "@/routes/auth-flow";
import { mountDocs } from "@/routes/docs";
import { eventRoutes } from "@/routes/events";
import { groupRoutes } from "@/routes/groups";
import { healthRoutes } from "@/routes/health";
import { leaveRoutes } from "@/routes/leave";
import { meRoutes } from "@/routes/me";
import { myRoutes } from "@/routes/my";
import { onboardingRoutes } from "@/routes/onboarding";
import { organizationRoutes } from "@/routes/organizations";
import { peopleRoutes } from "@/routes/people";
import { scheduleRoutes } from "@/routes/schedules";
import { sessionRoutes } from "@/routes/sessions";
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
  .route("/", authFlowRoutes)
  .route("/", healthRoutes)
  .route("/", meRoutes)
  .route("/", onboardingRoutes)
  .route("/", organizationRoutes)
  .route("/", peopleRoutes)
  .route("/", groupRoutes)
  .route("/", sessionRoutes)
  .route("/", scheduleRoutes)
  .route("/", myRoutes)
  .route("/", eventRoutes)
  .route("/", leaveRoutes);

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
