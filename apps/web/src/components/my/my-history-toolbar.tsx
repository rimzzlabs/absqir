import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { useStuck } from "@absqir/ui/hooks/use-stuck";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { cn } from "@absqir/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { A } from "@mobily/ts-belt";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { attendanceLabel } from "@/components/shared/status-badge";
import type { HistoryFilter } from "@/queries/use-my";

/** The empty string stands for every status; the URL then carries no `status`. */
export const EVERY_STATUS = "";

export type HistoryWindow = HistoryFilter["when"];

export interface MyHistoryToolbarProps {
  q: string;
  onQChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  when: HistoryWindow;
  onWhenChange: (value: HistoryWindow) => void;
  /** True when at least one filter narrows the list. */
  filtered: boolean;
  onClear: () => void;
}

const STATUSES = ["present", "late", "excused", "absent"] as const;
const WINDOWS = ["any", "30d", "90d", "12m"] as const satisfies HistoryWindow[];

function windowLabel(t: Translate, when: HistoryWindow): string {
  return match(when)
    .with("any", () => t("my:history.everyTime"))
    .with("30d", () => t("my:history.when30d"))
    .with("90d", () => t("my:history.when90d"))
    .with("12m", () => t("my:history.when12m"))
    .exhaustive();
}

/**
 * A title search, a status and a window above the list. The bar follows the
 * reader down the list, so a filter is never a scroll away. It carries its
 * own background and its own padding: the cards pass behind it, and the
 * background reaches the page gutter, so nothing shows through at the edges.
 */
export function MyHistoryToolbar(props: MyHistoryToolbarProps) {
  const t = useTranslate();
  const { bar, stuck } = useStuck<HTMLDivElement>();

  return (
    <div
      ref={bar}
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b px-4 py-3 backdrop-blur transition-colors md:-mx-6 md:top-(--app-bar-height) md:px-6",
        // The line belongs to the bar only while it floats. At rest it would
        // be one more rule across a page that already has enough.
        match(stuck)
          .with(true, () => "border-border" as const)
          .otherwise(() => "border-transparent" as const),
      )}
    >
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <MagnifyingGlassIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={t("my:history.searchLabel")}
          placeholder={t("my:history.search")}
          value={props.q}
          onChange={(event) => props.onQChange(event.target.value)}
        />
      </InputGroup>

      <Select
        items={[
          { value: EVERY_STATUS, label: t("my:history.everyStatus") },
          ...A.map(STATUSES, (status) => ({ value: status, label: attendanceLabel(t, status) })),
        ]}
        value={props.status}
        onValueChange={(value) => {
          if (typeof value === "string") props.onStatusChange(value);
        }}
      >
        <SelectTrigger aria-label={t("my:history.statusLabel")} className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={EVERY_STATUS}>{t("my:history.everyStatus")}</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("my:history.statusGroup")}</SelectLabel>
            {A.map(STATUSES, (status) => (
              <SelectItem key={status} value={status}>
                {attendanceLabel(t, status)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={A.map(WINDOWS, (when) => ({ value: when, label: windowLabel(t, when) }))}
        value={props.when}
        onValueChange={(value) => {
          if (typeof value === "string") props.onWhenChange(value as HistoryWindow);
        }}
      >
        <SelectTrigger aria-label={t("my:history.whenLabel")} className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="any">{t("my:history.everyTime")}</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("my:history.whenGroup")}</SelectLabel>
            {A.map(["30d", "90d", "12m"] as const, (when) => (
              <SelectItem key={when} value={when}>
                {windowLabel(t, when)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {match(props.filtered)
        .with(true, () => (
          <Button variant="ghost" size="sm" onClick={props.onClear}>
            <XIcon />
            {t("my:history.clear")}
          </Button>
        ))
        .otherwise(() => null)}
    </div>
  );
}
