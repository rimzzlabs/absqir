import { addDays, endOfDay, startOfDay } from "@absqir/core/date";
import { DatePicker } from "@absqir/ui/date-picker";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { A } from "@mobily/ts-belt";
import { presetRange, type RangePreset } from "@/lib/report-window";
import type { Group } from "@/queries/use-groups";
import type { ReportRange } from "@/queries/use-reports";

export type { RangePreset };
export { presetRange };

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

const ALL_GROUPS = "all";

export interface ReportRangeControlsProps {
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  groups: Group[];
}

/**
 * The range and the group filter. Picking a day switches the preset to
 * custom, so the buttons never claim a range they no longer describe.
 */
export function ReportRangeControls(props: ReportRangeControlsProps) {
  const setFrom = (value: Date | null) => {
    if (!value) return;

    props.onPresetChange("custom");
    props.onRangeChange({ ...props.range, from: startOfDay(value) });
  };

  const setTo = (value: Date | null) => {
    if (!value) return;

    props.onPresetChange("custom");
    props.onRangeChange({ ...props.range, to: endOfDay(value) });
  };

  return (
    <div className="border-border grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4">
        <ToggleGroup
          value={[props.preset]}
          onValueChange={(value) => {
            const next = value[0] as RangePreset | undefined;
            if (!next) return;

            props.onPresetChange(next);
            if (next !== "custom") {
              props.onRangeChange({ ...props.range, ...presetRange(next) });
            }
          }}
          variant="outline"
          className="flex-wrap"
        >
          {A.map(PRESETS, (preset) => (
            <ToggleGroupItem key={preset.value} value={preset.value}>
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Field>
        <FieldLabel htmlFor="report-from">From</FieldLabel>
        <FieldContent>
          <DatePicker
            id="report-from"
            value={props.range.from}
            onChange={setFrom}
            toDate={props.range.to}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="report-to">To</FieldLabel>
        <FieldContent>
          <DatePicker
            id="report-to"
            value={props.range.to}
            onChange={setTo}
            fromDate={props.range.from}
            toDate={addDays(new Date(), 365)}
          />
        </FieldContent>
      </Field>

      <Field className="lg:col-span-2">
        <FieldLabel htmlFor="report-group">Group</FieldLabel>
        <FieldContent>
          <Select
            items={[
              { value: ALL_GROUPS, label: "Every event" },
              ...A.map(props.groups, (group) => ({ value: group.id, label: group.name })),
            ]}
            value={props.range.groupId ?? ALL_GROUPS}
            onValueChange={(value) => {
              if (typeof value !== "string") return;

              props.onRangeChange({
                ...props.range,
                groupId: value === ALL_GROUPS ? null : value,
              });
            }}
          >
            <SelectTrigger id="report-group" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_GROUPS}>Every event</SelectItem>
              </SelectGroup>
              {props.groups.length > 0 ? (
                <SelectGroup>
                  <SelectLabel>Groups</SelectLabel>
                  {A.map(props.groups, (group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : null}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    </div>
  );
}
