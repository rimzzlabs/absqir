import { Diagram, Node, Note } from "./diagram";

const clockMarks = [
  { x: 180, label: "check-in opens" },
  { x: 380, label: "start" },
  { x: 520, label: "late after" },
  { x: 760, label: "end" },
];

export function EventClock() {
  return (
    <Diagram
      title="The event clock, from scheduled through running to done"
      viewBox="0 0 900 190"
      minWidth={700}
      caption="Nothing is stored. The status is read from the timestamps on every request, so an event closes itself on the next read after the end."
    >
      {clockMarks.map((mark) => (
        <g key={mark.label}>
          <Note x={mark.x} y={52} text={mark.label} size={11.5} />
          <line
            x1={mark.x}
            y1={64}
            x2={mark.x}
            y2={136}
            stroke="var(--vocs-border-color-primary)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        </g>
      ))}

      <Node x={40} y={88} width={140} height={36} label="scheduled" tone="muted" />
      <Node x={180} y={88} width={340} height={36} label="present" tone="good" />
      <Node x={520} y={88} width={240} height={36} label="late" tone="warn" />
      <Node x={760} y={88} width={100} height={36} label="done" tone="muted" />

      <Note x={110} y={152} text="the door is shut" size={11.5} />
      <Note x={350} y={152} text="a check-in here is present" size={11.5} />
      <Note x={640} y={152} text="a check-in here is late" size={11.5} />
      <Note x={806} y={152} text="absent rows written" size={11.5} />
    </Diagram>
  );
}
