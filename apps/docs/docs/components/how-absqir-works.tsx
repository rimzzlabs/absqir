import { Arrow, Diagram, Node } from "./diagram";

export function HowAbsqirWorks() {
  return (
    <Diagram
      title="How absqir works, from the groups on the list to the reports"
      viewBox="0 0 920 300"
      minWidth={720}
      caption="Everyone in the event's groups is on the list. When the event closes, everyone on the list without a record is marked absent."
    >
      <Node x={16} y={116} width={150} height={68} label="Groups" sub={["who is expected"]} />
      <Node
        x={204}
        y={116}
        width={150}
        height={68}
        label="Event"
        sub={["when, and for", "how long"]}
      />
      <Node
        x={392}
        y={116}
        width={150}
        height={68}
        label="Check-in"
        sub={["screen or scanner"]}
        tone="accent"
      />
      <Node x={580} y={116} width={150} height={68} label="Record" sub={["present or late"]} />
      <Node x={768} y={116} width={150} height={68} label="Reports" sub={["and the calendar"]} />

      <Node
        x={392}
        y={20}
        width={150}
        height={62}
        label="Room screen"
        sub={["a QR that rotates"]}
      />
      <Node x={392} y={218} width={150} height={62} label="Door scanner" sub={["reads a pass"]} />

      <Arrow from={[166, 150]} to={[200, 150]} />
      <Arrow from={[354, 150]} to={[388, 150]} />
      <Arrow from={[542, 150]} to={[576, 150]} />
      <Arrow from={[730, 150]} to={[764, 150]} />
      <Arrow from={[467, 86]} to={[467, 112]} tone="accent" />
      <Arrow from={[467, 214]} to={[467, 188]} tone="accent" />
    </Diagram>
  );
}
