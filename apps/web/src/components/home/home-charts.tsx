import {
  type EventRateRow,
  eventRateSeries,
  type GroupRateRow,
  groupRateSeries,
} from "@absqir/core/attendance-series";
import { buttonVariants } from "@absqir/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@absqir/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Recharts,
} from "@absqir/ui/chart";
import { CaretRightIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";

const { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } = Recharts;

export interface HomeChartsProps {
  events: readonly EventRateRow[];
  groups: readonly GroupRateRow[];
}

/** Both charts read the same measure, so one colour says so. */
const CHART_CONFIG = {
  percent: { label: "Attendance", color: "var(--color-primary)" },
} satisfies ChartConfig;

/** A percent axis always runs the whole way, so a dip is not a cliff. */
const PERCENT_DOMAIN: [number, number] = [0, 100];

const EMPTY_NOTE = "No event in the last 30 days has closed yet. A rate appears at the close.";

function ChartCard(props: {
  title: string;
  description: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
        <CardAction>
          <a href="/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Reports
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {match(props.empty)
          .with(true, () => (
            <p className="text-muted-foreground py-8 text-center text-sm">{EMPTY_NOTE}</p>
          ))
          .otherwise(() => props.children)}
      </CardContent>
    </Card>
  );
}

/** Attendance per event over the last 30 days, oldest first. */
function ByEvent(props: { rows: readonly EventRateRow[] }) {
  const points = eventRateSeries(props.rows);

  return (
    <ChartCard
      title="Attendance per event"
      description="The last 30 days, oldest first."
      empty={points.length === 0}
    >
      <ChartContainer config={CHART_CONFIG} className="h-56 w-full">
        <LineChart data={points} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis
            domain={PERCENT_DOMAIN}
            tickCount={3}
            tickLine={false}
            axisLine={false}
            width={34}
            tickFormatter={(value: number) => `${value}%`}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => `${String(value)}%`} />}
          />
          <Line
            dataKey="percent"
            type="monotone"
            stroke="var(--color-percent)"
            strokeWidth={2}
            dot={points.length < 20}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}

/** Attendance by group over the same 30 days, worst first. */
function ByGroup(props: { rows: readonly GroupRateRow[] }) {
  const points = groupRateSeries(props.rows);

  return (
    <ChartCard
      title="Attendance by group"
      description="The last 30 days, worst first."
      empty={points.length === 0}
    >
      <ChartContainer config={CHART_CONFIG} className="h-56 w-full">
        <BarChart
          data={points}
          layout="vertical"
          margin={{ left: 4, right: 12 }}
          accessibilityLayer
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            domain={PERCENT_DOMAIN}
            tickCount={3}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={96}
            tickFormatter={(value: string) => value.slice(0, 14)}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => `${String(value)}%`} />}
          />
          <Bar dataKey="percent" fill="var(--color-percent)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/**
 * The two charts of the organizer's front page. One module, so `React.lazy`
 * loads recharts once and only for the reader who sees the dashboard.
 */
export default function HomeCharts(props: HomeChartsProps) {
  return (
    <>
      <ByEvent rows={props.events} />
      <ByGroup rows={props.groups} />
    </>
  );
}
