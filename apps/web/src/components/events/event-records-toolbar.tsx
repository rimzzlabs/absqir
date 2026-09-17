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
import { type AttendanceStatus, attendanceLabel } from "@/components/shared/status-badge";
import { StickyToolbar } from "@/components/shared/sticky-toolbar";

/** The empty string stands for every status; the URL then carries no `status`. */
export const EVERY_STATUS = "";

/** Everyone the event still waits on. Not an attendance status, a lack of one. */
export const NOT_YET = "none";

export interface EventRecordsToolbarProps {
  q: string;
  onQChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  /** True when at least one filter narrows the list. */
  filtered: boolean;
  onClear: () => void;
}

const STATUSES: AttendanceStatus[] = ["present", "late", "excused", "absent"];

function statusLabel(t: Translate, value: string): string {
  return match(value)
    .with(NOT_YET, () => t("common:attendance.notYet"))
    .with("present", "late", "excused", "absent", (status) => attendanceLabel(t, status))
    .otherwise(() => t("events:records.everyStatus"));
}

/** A name search and a status filter above the records list. */
export function EventRecordsToolbar(props: EventRecordsToolbarProps) {
  const t = useTranslate();

  return (
    <StickyToolbar>
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <MagnifyingGlassIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={t("events:records.searchLabel")}
          placeholder={t("events:records.search")}
          value={props.q}
          onChange={(event) => props.onQChange(event.target.value)}
        />
      </InputGroup>

      <Select
        items={[
          { value: EVERY_STATUS, label: t("events:records.everyStatus") },
          ...A.map([...STATUSES, NOT_YET], (value) => ({
            value,
            label: statusLabel(t, value),
          })),
        ]}
        value={props.status}
        onValueChange={(value) => {
          if (typeof value === "string") props.onStatusChange(value);
        }}
      >
        <SelectTrigger aria-label={t("events:records.filterByStatus")} className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={EVERY_STATUS}>{t("events:records.everyStatus")}</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("events:records.statusGroup")}</SelectLabel>
            {A.map(STATUSES, (status) => (
              <SelectItem key={status} value={status}>
                {attendanceLabel(t, status)}
              </SelectItem>
            ))}
            <SelectItem value={NOT_YET}>{t("common:attendance.notYet")}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {match(props.filtered)
        .with(true, () => (
          <Button variant="ghost" size="sm" onClick={props.onClear}>
            <XIcon />
            {t("events:records.clear")}
          </Button>
        ))
        .otherwise(() => null)}
    </StickyToolbar>
  );
}
