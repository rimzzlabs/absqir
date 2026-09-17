import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
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
import { StickyToolbar } from "@/components/shared/sticky-toolbar";
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

/** A title search, a status and a window above the list. */
export function MyHistoryToolbar(props: MyHistoryToolbarProps) {
  const t = useTranslate();

  return (
    <StickyToolbar>
      {/* Three controls do not fit one row on a phone, so the search takes
          its own and the two selects share the next. They never leave half
          a row empty. */}
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        <InputGroup className="min-w-0 basis-full sm:basis-auto sm:max-w-64 sm:flex-1">
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
          <SelectTrigger
            aria-label={t("my:history.statusLabel")}
            className="min-w-0 flex-1 sm:max-w-44"
          >
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
          <SelectTrigger
            aria-label={t("my:history.whenLabel")}
            className="min-w-0 flex-1 sm:max-w-44"
          >
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
            <Button variant="ghost" size="sm" className="shrink-0" onClick={props.onClear}>
              <XIcon />
              {t("my:history.clear")}
            </Button>
          ))
          .otherwise(() => null)}
      </div>
    </StickyToolbar>
  );
}
