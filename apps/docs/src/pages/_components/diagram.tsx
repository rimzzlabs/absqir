import type { ReactNode } from "react";
import { match, P } from "ts-pattern";

export type Tone = "plain" | "muted" | "accent" | "good" | "warn" | "bad";

const toneFill: Record<Tone, string> = {
  plain: "var(--vocs-background-color-surface)",
  muted: "var(--vocs-background-color-surfaceMuted)",
  accent: "var(--vocs-background-color-info-tint)",
  good: "var(--vocs-background-color-success-tint)",
  warn: "var(--vocs-background-color-warning-tint)",
  bad: "var(--vocs-color-destructive-tint)",
};

const toneStroke: Record<Tone, string> = {
  plain: "var(--vocs-border-color-primary)",
  muted: "var(--vocs-border-color-primary)",
  accent: "var(--vocs-color-accent)",
  good: "var(--vocs-border-color-success-tint)",
  warn: "var(--vocs-border-color-warning-tint)",
  bad: "var(--vocs-border-color-destructive-tint)",
};

const inkFor: Record<"muted" | "accent" | "strong", string> = {
  muted: "var(--vocs-text-color-muted)",
  accent: "var(--vocs-color-accent)",
  strong: "var(--vocs-text-color-primary)",
};

export interface DiagramProps {
  title: string;
  viewBox: string;
  minWidth: number;
  caption?: string;
  children: ReactNode;
}

export function Diagram(props: DiagramProps) {
  return (
    <figure style={{ margin: "28px 0", overflowX: "auto" }}>
      <svg
        role="img"
        aria-label={props.title}
        viewBox={props.viewBox}
        fontFamily="inherit"
        style={{ display: "block", width: "100%", minWidth: props.minWidth, height: "auto" }}
      >
        <title>{props.title}</title>
        {props.children}
      </svg>
      {match(props.caption)
        .with(P.string.minLength(1), (caption) => (
          <figcaption
            style={{
              color: "var(--vocs-text-color-muted)",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              marginTop: "10px",
            }}
          >
            {caption}
          </figcaption>
        ))
        .otherwise(() => null)}
    </figure>
  );
}

export interface NodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sub?: string[];
  tone?: Tone;
}

export function Node(props: NodeProps) {
  const tone = props.tone ?? "plain";
  const lines = props.sub ?? [];
  const cx = props.x + props.width / 2;
  const cy = props.y + props.height / 2;
  const labelY = cy - (lines.length * 15) / 2;
  return (
    <g>
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx={10}
        fill={toneFill[tone]}
        stroke={toneStroke[tone]}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight={600}
        fill="var(--vocs-text-color-primary)"
      >
        {props.label}
      </text>
      {lines.map((line, index) => (
        <text
          key={line}
          x={cx}
          y={labelY + 15 + index * 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11.5}
          fill="var(--vocs-text-color-muted)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export interface ArrowProps {
  from: [number, number];
  to: [number, number];
  dashed?: boolean;
  tone?: "muted" | "accent";
}

export function Arrow(props: ArrowProps) {
  const [x1, y1] = props.from;
  const [x2, y2] = props.to;
  const color = inkFor[props.tone ?? "muted"];
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={match(Boolean(props.dashed))
          .with(true, () => "5 4")
          .otherwise(() => undefined)}
      />
      <path
        d="M0 0 L-8 -4.5 L-8 4.5 Z"
        fill={color}
        transform={`translate(${x2} ${y2}) rotate(${angle})`}
      />
    </g>
  );
}

export interface NoteProps {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  tone?: "muted" | "accent" | "strong";
  weight?: number;
  size?: number;
}

export function Note(props: NoteProps) {
  return (
    <text
      x={props.x}
      y={props.y}
      textAnchor={props.anchor ?? "middle"}
      dominantBaseline="middle"
      fontSize={props.size ?? 12}
      fontWeight={props.weight ?? 400}
      fill={inkFor[props.tone ?? "muted"]}
    >
      {props.text}
    </text>
  );
}
