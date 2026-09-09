import { Arrow, Diagram, Node } from "./diagram";

export function TheHeartbeat() {
  return (
    <Diagram
      title="The three jobs the heartbeat runs, and where a notification lands"
      viewBox="0 0 900 290"
      minWidth={720}
      caption="Reading a page settles the organization it belongs to, so a small instance needs no scheduler at all. The heartbeat only makes the same work eager, so a reminder arrives while nobody is looking."
    >
      <Node
        x={16}
        y={118}
        width={150}
        height={64}
        label="Every minute"
        sub={["a timer, or", "POST /api/tick"]}
        tone="accent"
      />

      <Node
        x={216}
        y={36}
        width={210}
        height={60}
        label="Spawn events"
        sub={["from the schedules"]}
      />
      <Node
        x={216}
        y={122}
        width={210}
        height={60}
        label="Close ended events"
        sub={["and write absent rows"]}
      />
      <Node
        x={216}
        y={208}
        width={210}
        height={60}
        label="Send reminders"
        sub={["a day, then an hour, ahead"]}
      />

      <Node
        x={478}
        y={36}
        width={200}
        height={60}
        label="New events"
        sub={["on the calendar"]}
        tone="muted"
      />
      <Node
        x={478}
        y={122}
        width={200}
        height={60}
        label="Absent records"
        sub={["and a closed notice"]}
      />
      <Node
        x={478}
        y={208}
        width={200}
        height={60}
        label="Reminder rows"
        sub={["one key, one row"]}
      />

      <Node
        x={730}
        y={122}
        width={155}
        height={60}
        label="Where it lands"
        sub={["the bell, the list,", "the inbox"]}
        tone="accent"
      />

      <Arrow from={[166, 150]} to={[212, 70]} />
      <Arrow from={[166, 150]} to={[212, 152]} />
      <Arrow from={[166, 150]} to={[212, 234]} />
      <Arrow from={[426, 66]} to={[474, 66]} />
      <Arrow from={[426, 152]} to={[474, 152]} />
      <Arrow from={[426, 238]} to={[474, 238]} />
      <Arrow from={[678, 152]} to={[726, 146]} />
      <Arrow from={[678, 238]} to={[726, 170]} />
    </Diagram>
  );
}
