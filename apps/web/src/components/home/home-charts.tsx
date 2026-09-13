import {
  type EventRateRow,
  eventRateSeries,
  type GroupRateRow,
  groupRateSeries,
} from "@absqir/core/attendance-series";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
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

/** A percent axis always runs the whole way, so a dip is not a cliff. */
const PERCENT_DOMAIN: [number, number] = [0, 100];

/** Both charts read the same measure, so one colour says so. */
function chartConfig(t: Translate) {
  return {
    percent: { label: t("home:charts.measure"), color: "var(--color-primary)" },
  } satisfies ChartConfig;
}

function ChartCard(props: {
  title: string;
  description: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
        <CardAction>
          <a href="/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("home:charts.reports")}
            <CaretRightIcon />
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {match(props.empty)
          .with(true, () => (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {t("home:charts.empty")}
            </p>
          ))
          .otherwise(() => props.children)}
      </CardContent>
    </Card>
  );
}

/** Attendance per event over the last 30 days, oldest first. */
function ByEvent(props: { rows: readonly EventRateRow[] }) {
  const t = useTranslate();
  const points = eventRateSeries(props.rows);

  return (
    <ChartCard
      title={t("home:charts.byEvent")}
      description={t("home:charts.byEventHint")}
      empty={points.length === 0}
    >
      <ChartContainer config={chartConfig(t)} className="h-56 w-full">
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
  const t = useTranslate();
  const points = groupRateSeries(props.rows);

  return (
    <ChartCard
      title={t("home:charts.byGroup")}
      description={t("home:charts.byGroupHint")}
      empty={points.length === 0}
    >
      <ChartContainer config={chartConfig(t)} className="h-56 w-full">
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
