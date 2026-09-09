import { Arrow, Diagram, Node, Note } from "./diagram";

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
        stroke="var(--vocs-color-accent)"
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
        stroke="var(--vocs-border-color-primary)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <line
        x1={435}
        y1={144}
        x2={435}
        y2={174}
        stroke="var(--vocs-border-color-primary)"
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
