import { Diagram, Node, Note } from "./diagram";

export function TwoRates() {
  return (
    <Diagram
      title="Which records feed the attendance rate, and which feed the on-time rate"
      viewBox="0 0 880 200"
      minWidth={680}
      caption="Excused is neither presence nor absence, so it counts for neither rate and against neither. A dash means nothing was judged yet."
    >
      <path
        d="M40 68 V58 H466 V68"
        fill="none"
        stroke="var(--vocs-color_borderGreen)"
        strokeWidth={1.5}
      />
      <Note x={253} y={42} text="on time = present ÷ this" tone="strong" weight={600} />

      <Node x={40} y={76} width={294} height={52} label="present" tone="good" />
      <Node x={340} y={76} width={126} height={52} label="late" tone="warn" />
      <Node x={472} y={76} width={214} height={52} label="absent" tone="bad" />
      <Node x={692} y={76} width={148} height={52} label="excused" tone="muted" />

      <path
        d="M40 136 V146 H686 V136"
        fill="none"
        stroke="var(--vocs-color_borderAccent)"
        strokeWidth={1.5}
      />
      <Note
        x={363}
        y={164}
        text="attendance = (present + late) ÷ this"
        tone="strong"
        weight={600}
      />
      <Note x={766} y={146} text="left out of both" />
    </Diagram>
  );
}
