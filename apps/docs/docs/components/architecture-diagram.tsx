import { Arrow, Diagram, Node, Note } from "./diagram";

export function OneOriginTwoTargets() {
  return (
    <Diagram
      title="One origin serves the pages, the API and the auth routes, on either target"
      viewBox="0 0 900 300"
      minWidth={720}
      caption="Platform access — the database connection, the rate limiter, the environment — sits behind one small interface, picked per target at build time."
    >
      <Node x={16} y={120} width={140} height={64} label="Browser" />

      <rect
        x={200}
        y={30}
        width={400}
        height={250}
        rx={14}
        fill="none"
        stroke="var(--vocs-color_borderAccent)"
        strokeWidth={1.5}
        strokeDasharray="6 5"
      />
      <Note x={400} y={52} text="one origin — no CORS, a SameSite=Lax cookie" tone="accent" />
      <Node
        x={224}
        y={68}
        width={352}
        height={56}
        label="Astro pages"
        sub={["/ — dashboard, onboarding, room screen"]}
      />
      <Node
        x={224}
        y={136}
        width={352}
        height={56}
        label="Hono API"
        sub={["/api — directory, groups, events, reports"]}
      />
      <Node
        x={224}
        y={204}
        width={352}
        height={56}
        label="Better Auth"
        sub={["/api/auth — codes, passwords, organizations"]}
      />

      <Node
        x={640}
        y={36}
        width={244}
        height={60}
        label="Node and Postgres"
        sub={["the Docker image you run"]}
      />
      <Node
        x={640}
        y={125}
        width={244}
        height={60}
        label="Platform access"
        sub={["database, rate limit, env"]}
        tone="accent"
      />
      <Node
        x={640}
        y={214}
        width={244}
        height={60}
        label="Cloudflare Workers"
        sub={["how the hosted version will run"]}
      />

      <Arrow from={[156, 152]} to={[196, 152]} />
      <Arrow from={[600, 155]} to={[636, 155]} />
      <Arrow from={[762, 123]} to={[762, 100]} />
      <Arrow from={[762, 187]} to={[762, 210]} />
    </Diagram>
  );
}

export function RotatingToken() {
  return (
    <Diagram
      title="The server accepts the current 20 second window and the one before it"
      viewBox="0 0 880 280"
      minWidth={700}
      caption="The token is an HMAC over the event id and the window, keyed by a secret that never leaves the server. Nothing about the code is worth copying for longer than it lives."
    >
      <path
        d="M200 70 V60 H510 V70"
        fill="none"
        stroke="var(--vocs-color_textAccent)"
        strokeWidth={1.5}
      />
      <Note x={355} y={44} text="the server accepts these" tone="accent" />

      <Node x={40} y={80} width={150} height={60} label="n − 2" sub={["expired"]} tone="muted" />
      <Node
        x={200}
        y={80}
        width={150}
        height={60}
        label="n − 1"
        sub={["still accepted"]}
        tone="accent"
      />
      <Node x={360} y={80} width={150} height={60} label="n" sub={["current"]} tone="accent" />
      <Node x={520} y={80} width={150} height={60} label="n + 1" sub={["not yet"]} />
      <Node x={680} y={80} width={150} height={60} label="n + 2" sub={["not yet"]} />

      <line
        x1={115}
        y1={144}
        x2={115}
        y2={174}
        stroke="var(--vocs-color_border)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <line
        x1={435}
        y1={144}
        x2={435}
        y2={174}
        stroke="var(--vocs-color_border)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <Node
        x={40}
        y={178}
        width={150}
        height={48}
        label="a photo"
        sub={["taken here"]}
        tone="bad"
      />
      <Node x={360} y={178} width={150} height={48} label="refused" sub={["by then"]} tone="bad" />
      <Arrow from={[194, 202]} to={[356, 202]} dashed />

      <Arrow from={[40, 250]} to={[830, 250]} />
      <Note x={435} y={268} text="time — one window every 20 seconds" />
    </Diagram>
  );
}
