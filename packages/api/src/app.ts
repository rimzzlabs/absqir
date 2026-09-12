import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { match, P } from "ts-pattern";
import { csrfPolicy, payloadLimit, rateLimit, securityHeaders } from "#src/middleware/security";
import { currentSession, requestContext } from "#src/middleware/session";
import { authRoutes } from "#src/routes/auth";
import { authFlowRoutes } from "#src/routes/auth-flow";
import { calendarRoutes } from "#src/routes/calendar";
import { mountDocs } from "#src/routes/docs";
import { domainRoutes } from "#src/routes/domains";
import { eventRoutes } from "#src/routes/events";
import { groupRoutes } from "#src/routes/groups";
import { healthRoutes } from "#src/routes/health";
import { joinRequestRoutes } from "#src/routes/join-requests";
import { leaveRoutes } from "#src/routes/leave";
import { meRoutes } from "#src/routes/me";
import { myRoutes } from "#src/routes/my";
import { notificationRoutes } from "#src/routes/notifications";
import { onboardingRoutes } from "#src/routes/onboarding";
import { organizationRoutes } from "#src/routes/organizations";
import { peopleRoutes } from "#src/routes/people";
import { publicEventRoutes } from "#src/routes/public-events";
import { reportRoutes } from "#src/routes/reports";
import { scheduleRoutes } from "#src/routes/schedules";
import { tickRoutes } from "#src/routes/tick";
import type { AppEnv } from "#src/types";

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
  .route("/", joinRequestRoutes)
  .route("/", domainRoutes)
  .route("/", organizationRoutes)
  .route("/", peopleRoutes)
  .route("/", groupRoutes)
  .route("/", eventRoutes)
  .route("/", scheduleRoutes)
  .route("/", myRoutes)
  .route("/", publicEventRoutes)
  .route("/", leaveRoutes)
  .route("/", reportRoutes)
  .route("/", calendarRoutes)
  .route("/", notificationRoutes)
  .route("/", tickRoutes);

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
