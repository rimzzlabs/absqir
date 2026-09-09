import { Arrow, Diagram, Node, Note } from "./diagram";

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
            stroke="var(--vocs-color_border)"
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

export function TwoWaysToCheckIn() {
  return (
    <Diagram
      title="Two ways to check in: the room screen, and the pass at the door"
      viewBox="0 0 900 250"
      minWidth={720}
      caption="Both codes are signed with the same per-event secret, so both are checked by the server before anything is written. Either way, the clock decides present or late."
    >
      <Node
        x={16}
        y={90}
        width={160}
        height={80}
        label="Event secret"
        sub={["never leaves", "the server"]}
        tone="accent"
      />

      <Node
        x={236}
        y={30}
        width={200}
        height={64}
        label="Room screen"
        sub={["a QR that rotates", "every 20 seconds"]}
      />
      <Node
        x={496}
        y={30}
        width={200}
        height={64}
        label="The member scans"
        sub={["from Check in, or with", "the phone camera"]}
      />

      <Node
        x={236}
        y={166}
        width={200}
        height={64}
        label="The member's pass"
        sub={["a QR bound to", "that one person"]}
      />
      <Node
        x={496}
        y={166}
        width={200}
        height={64}
        label="The organizer scans"
        sub={["at the door"]}
      />

      <Node
        x={736}
        y={90}
        width={150}
        height={80}
        label="Record"
        sub={["present or late"]}
        tone="good"
      />

      <Arrow from={[176, 112]} to={[232, 66]} tone="accent" />
      <Arrow from={[176, 148]} to={[232, 194]} tone="accent" />
      <Arrow from={[436, 62]} to={[492, 62]} />
      <Arrow from={[436, 198]} to={[492, 198]} />
      <Arrow from={[696, 62]} to={[732, 110]} />
      <Arrow from={[696, 198]} to={[732, 150]} />
    </Diagram>
  );
}
