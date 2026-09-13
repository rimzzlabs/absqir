"use client";

import { A } from "@mobily/ts-belt";
import { cn } from "cn";
import * as React from "react";
import type { TooltipValueType } from "recharts";
import * as RechartsPrimitive from "recharts";
import { match, P } from "ts-pattern";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  initialDimension?: {
    width: number;
    height: number;
  };
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = A.filter(
    Object.entries(config),
    ([, config]) => (config.theme ?? config.color) !== undefined,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: the CSS is built from the chart config, never from user input
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${A.map(colorConfig, ([key, itemConfig]) => {
  const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
  return match(color)
    .with(P.string.minLength(1), (color) => `  --color-${key}: ${color};`)
    .otherwise(() => null);
}).join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    "accessibilityLayer"
  >) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = match({ labelKey, label })
      .with(
        { labelKey: P.union(P.nullish, ""), label: P.string },
        ({ label }) => config[label]?.label ?? label,
      )
      .otherwise(() => itemConfig?.label);

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";
  const shown = A.filter(payload, (item) => item.type !== "none");

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {match(nestLabel)
        .with(true, () => null)
        .otherwise(() => tooltipLabel)}
      <div className="grid gap-1.5">
        {A.mapWithIndex(shown, (index, item) => {
          const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color ?? item.payload?.fill ?? item.color;

          return (
            <div
              key={index}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center",
              )}
            >
              {match({ formatter, value: item?.value, name: item?.name })
                .with(
                  { formatter: P.nonNullable, value: P.nonNullable, name: P.nonNullable },
                  ({ formatter, value, name }) => formatter(value, name, item, index, item.payload),
                )
                .otherwise(() => (
                  <>
                    {match(itemConfig?.icon)
                      .with(
                        P.nullish,
                        () =>
                          !hideIndicator && (
                            <div
                              className={cn(
                                "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                                {
                                  "h-2.5 w-2.5": indicator === "dot",
                                  "w-1": indicator === "line",
                                  "w-0 border-[1.5px] border-dashed bg-transparent":
                                    indicator === "dashed",
                                  "my-0.5": nestLabel && indicator === "dashed",
                                },
                              )}
                              style={
                                {
                                  "--color-bg": indicatorColor,
                                  "--color-border": indicatorColor,
                                } as React.CSSProperties
                              }
                            />
                          ),
                      )
                      .otherwise((Icon) => (
                        <Icon />
                      ))}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        match(nestLabel)
                          .with(true, () => "items-end" as const)
                          .otherwise(() => "items-center" as const),
                      )}
                    >
                      <div className="grid gap-1.5">
                        {match(nestLabel)
                          .with(true, () => tooltipLabel)
                          .otherwise(() => null)}
                        <span className="text-muted-foreground">
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {match(item.value)
                            .with(P.number, (value) => value.toLocaleString())
                            .otherwise((value) => String(value))}
                        </span>
                      )}
                    </div>
                  </>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  const shown = A.filter(payload, (item) => item.type !== "none");

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        match(verticalAlign)
          .with("top", () => "pb-3" as const)
          .otherwise(() => "pt-3" as const),
        className,
      )}
    >
      {A.mapWithIndex(shown, (index, item) => {
        const key = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={index}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
            )}
          >
            {match({ icon: itemConfig?.icon, hideIcon })
              .with({ icon: P.nonNullable, hideIcon: false }, ({ icon: Icon }) => <Icon />)
              .otherwise(() => (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              ))}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload = match(payload)
    .when(
      (it): it is { payload: object } =>
        "payload" in it && typeof it.payload === "object" && it.payload !== null,
      (it) => it.payload,
    )
    .otherwise(() => undefined);

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return match(configLabelKey in config)
    .with(true, () => config[configLabelKey])
    .otherwise(() => config[key]);
}

/**
 * recharts is a dependency of this package alone, so a consumer reaches the
 * primitives through here. One copy means one React context, which the chart
 * parts rely on.
 */
export * as Recharts from "recharts";

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
