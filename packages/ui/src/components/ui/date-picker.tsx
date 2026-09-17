import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { A, O, pipe } from "@mobily/ts-belt";

("use client");

import { CalendarBlankIcon, ClockIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import {
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  isValid,
  setHours,
  setMinutes,
} from "date-fns";
import * as React from "react";
import { match, P } from "ts-pattern";
import { Button } from "#src/components/ui/button";
import { Calendar } from "#src/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#src/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "#src/components/ui/popover";

/* ---------------------------------- date --------------------------------- */

export interface DatePickerProps {
  id?: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest and latest selectable days, inclusive. */
  fromDate?: Date;
  toDate?: Date;
  /** How the chosen day reads on the trigger. */
  displayFormat?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

/** A day, picked from a calendar in a popover. The trigger reads as a field. */
function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  fromDate,
  toDate,
  displayFormat = "EEE d MMM yyyy",
  className,
  ...props
}: DatePickerProps) {
  const t = useTranslate();
  const [open, setOpen] = React.useState(false);
  const empty = placeholder ?? t("common:fields.pickDate");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={props["aria-invalid"]}
            data-slot="date-picker-trigger"
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarBlankIcon className="text-muted-foreground" />
        {match(value)
          .with(P.nullish, () => empty)
          .otherwise((value) => format(value, displayFormat))}
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(8)]"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          disabled={[
            ...match(fromDate)
              .with(P.nullish, () => [])
              .otherwise((fromDate) => [{ before: fromDate }]),
            ...match(toDate)
              .with(P.nullish, () => [])
              .otherwise((toDate) => [{ after: toDate }]),
          ]}
          onSelect={(day) => {
            onChange(day ?? null);
            if (day) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ---------------------------------- time --------------------------------- */

export interface TimeFieldProps {
  id?: string;
  /** "HH:mm", or an empty string. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Minutes moved by the arrow keys. */
  step?: number;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "930" → "09:30", "9" → "09:00", "0915" → "09:15". Null when it is not a time. */
function normalizeClock(raw: string): string | null {
  const digits = raw.replaceAll(/\D/g, "");
  if (digits.length === 0) return "";

  let hours: number;
  let minutes: number;

  if (digits.length <= 2) {
    hours = Number(digits);
    minutes = 0;
  } else if (digits.length === 3) {
    hours = Number(digits.slice(0, 1));
    minutes = Number(digits.slice(1));
  } else {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2, 4));
  }

  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function shiftClock(value: string, minutes: number): string {
  const [h, m] = A.map(value.split(":"), Number);
  const total = ((((h ?? 0) * 60 + (m ?? 0) + minutes) % 1440) + 1440) % 1440;

  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * A 24-hour time typed as text and tidied on blur, with arrow keys to nudge
 * it. No browser time widget: it reads the same on every platform.
 */
function TimeField({
  id,
  value,
  onChange,
  disabled,
  placeholder = "09:00",
  step = 5,
  className,
  ...props
}: TimeFieldProps) {
  const [draft, setDraft] = React.useState(value);

  // A value set from outside (a form reset) replaces what is being typed.
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    const normalized = normalizeClock(raw);
    if (normalized === null) {
      setDraft(value);
      return;
    }
    setDraft(normalized);
    if (normalized !== value) onChange(normalized);
  };

  return (
    <InputGroup className={cn("min-w-0", className)} data-slot="time-field">
      <InputGroupAddon>
        <ClockIcon />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        // A text input is 20 characters wide by default, which would drag a
        // popover wider than the calendar above it.
        size={6}
        className="min-w-0"
        aria-invalid={props["aria-invalid"]}
        aria-label={props["aria-label"]}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const base = match(CLOCK.test(draft))
              .with(true, () => draft)
              .otherwise(() => (normalizeClock(draft) ?? value) || "00:00");
            const next = shiftClock(
              base,
              match(event.key)
                .with("ArrowUp", () => step)
                .otherwise(() => -step),
            );
            setDraft(next);
            onChange(next);
          }
        }}
      />
    </InputGroup>
  );
}

/* ------------------------------- date + time ------------------------------ */

export interface DateTimePickerProps {
  id?: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  placeholder?: string;
  /** How the chosen instant reads on the trigger. */
  displayFormat?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

function withClock(day: Date, clock: string): Date {
  const [h, m] = A.map(clock.split(":"), Number);
  return setMinutes(setHours(day, h ?? 0), m ?? 0);
}

/**
 * One field for one instant. The trigger reads the date and the time; the
 * popover holds the calendar with the time field underneath, so the two
 * never fight for a row.
 */
function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  fromDate,
  toDate,
  placeholder,
  displayFormat = "EEE d MMM yyyy, HH:mm",
  className,
  ...props
}: DateTimePickerProps) {
  const t = useTranslate();
  const [open, setOpen] = React.useState(false);
  const empty = placeholder ?? t("common:fields.pickDateTime");
  const clock = match(value)
    .with(P.nonNullable.and(P.when(isValid)), (value) => format(value, "HH:mm"))
    .otherwise(() => "09:00");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={props["aria-invalid"]}
            data-slot="date-time-picker-trigger"
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarBlankIcon className="text-muted-foreground" />
        <span className="truncate">
          {match(value)
            .with(P.nullish, () => empty)
            .otherwise((value) => format(value, displayFormat))}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-fit gap-0 p-0" align="start">
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(8)]"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          disabled={[
            ...match(fromDate)
              .with(P.nullish, () => [])
              .otherwise((fromDate) => [{ before: fromDate }]),
            ...match(toDate)
              .with(P.nullish, () => [])
              .otherwise((toDate) => [{ after: toDate }]),
          ]}
          onSelect={(day) =>
            onChange(
              pipe(
                O.fromNullable(day),
                O.map((day) => withClock(day, clock)),
                O.toNullable,
              ),
            )
          }
        />
        <div className="border-border flex items-center gap-2 border-t p-2">
          <TimeField
            id={match(id)
              .with(P.string.minLength(1), (id) => `${id}-time`)
              .otherwise(() => undefined)}
            aria-label={t("common:fields.time")}
            value={match(value)
              .with(P.nullish, () => "")
              .otherwise(() => clock)}
            disabled={!value}
            placeholder={match(value)
              .with(P.nullish, () => t("common:fields.pickDayFirst"))
              .otherwise(() => undefined)}
            className="flex-1"
            onChange={(next) => {
              if (value && next) onChange(withClock(value, next));
            }}
          />
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------- range --------------------------------- */

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangePickerProps {
  id?: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest and latest selectable days, inclusive. */
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  "aria-label"?: string;
}

/** The clock of an instant, or the fallback for an end that has none yet. */
function clockOf(value: Date | null, fallback: string): string {
  return match(value)
    .with(P.nullish, () => fallback)
    .otherwise((value) => format(value, "HH:mm"));
}

/** True while the window covers whole days, which needs no clock on the trigger. */
function wholeDays(value: DateRange): boolean {
  return (
    (value.from === null || format(value.from, "HH:mm") === "00:00") &&
    (value.to === null || format(value.to, "HH:mm") === "23:59")
  );
}

/**
 * The shortest reading of one end that still says what it means.
 *
 * A window inside one month says the month once, and a window inside one
 * year says the year once. The clock only appears when it is not the whole
 * day, because "00:00 to 23:59" is what a plain date already means.
 */
function endLabel(at: Date, other: Date | null, clock: boolean): string {
  const day = match(other)
    .with(P.nullish, () => "d MMM yyyy")
    .otherwise((other) =>
      match({
        month: isSameMonth(at, other) && isSameYear(at, other),
        year: isSameYear(at, other),
      })
        .with({ month: true }, () => "d")
        .with({ year: true }, () => "d MMM")
        .otherwise(() => "d MMM yyyy"),
    );

  return format(
    at,
    match(clock)
      .with(true, () => `${day}, HH:mm`)
      .otherwise(() => day),
  );
}

function rangeLabel(t: Translate, value: DateRange, empty: string): string {
  const clock = !wholeDays(value);

  return match([value.from, value.to] as const)
    .with([P.nonNullable, P.nonNullable], ([from, to]) =>
      match(isSameDay(from, to) && !clock)
        .with(true, () => format(from, "d MMM yyyy"))
        .otherwise(() =>
          t("common:fields.range", {
            // The last end carries the month and the year for both.
            from: endLabel(from, to, clock),
            to: endLabel(to, null, clock),
          }),
        ),
    )
    .with([P.nonNullable, P.nullish], ([from]) =>
      t("common:fields.rangeFrom", { from: endLabel(from, null, clock) }),
    )
    .with([P.nullish, P.nonNullable], ([, to]) =>
      t("common:fields.rangeUntil", { to: endLabel(to, null, clock) }),
    )
    .otherwise(() => empty);
}

/**
 * One window: two days picked in a single calendar, with a time under each
 * end.
 *
 * A range is one gesture, not two fields. The first press sets the start,
 * the second the end, and the days between light up as the reader drags
 * across them. The times default to the whole day, so picking two days
 * alone means exactly what it looks like.
 */
function DateRangePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  fromDate,
  toDate,
  className,
  ...props
}: DateRangePickerProps) {
  const t = useTranslate();
  const empty = placeholder ?? t("common:fields.pickDate");
  const fromClock = clockOf(value.from, "00:00");
  const toClock = clockOf(value.to, "23:59");

  const bounds = [
    ...match(fromDate)
      .with(P.nullish, () => [])
      .otherwise((fromDate) => [{ before: fromDate }]),
    ...match(toDate)
      .with(P.nullish, () => [])
      .otherwise((toDate) => [{ after: toDate }]),
  ];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={props["aria-label"]}
            data-slot="date-range-picker-trigger"
            className={cn(
              "w-full justify-start font-normal",
              !value.from && !value.to && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarBlankIcon className="text-muted-foreground" />
        <span className="truncate">{rangeLabel(t, value, empty)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-fit gap-0 p-0" align="start">
        <Calendar
          mode="range"
          className="[--cell-size:--spacing(8)]"
          selected={{ from: value.from ?? undefined, to: value.to ?? undefined }}
          defaultMonth={value.from ?? undefined}
          disabled={bounds}
          onSelect={(range) =>
            onChange({
              from: pipe(
                O.fromNullable(range?.from),
                O.map((day: Date) => withClock(day, fromClock)),
                O.toNullable,
              ),
              to: pipe(
                O.fromNullable(range?.to),
                O.map((day: Date) => withClock(day, toClock)),
                O.toNullable,
              ),
            })
          }
        />
        <div className="border-border flex items-center gap-2 border-t p-2">
          <TimeField
            aria-label={t("common:fields.startTime")}
            value={match(value.from)
              .with(P.nullish, () => "")
              .otherwise(() => fromClock)}
            disabled={!value.from}
            placeholder={t("common:fields.pickDayFirst")}
            onChange={(clock) =>
              onChange({
                from: pipe(
                  O.fromNullable(value.from),
                  O.map((day: Date) => withClock(day, clock)),
                  O.toNullable,
                ),
                to: value.to,
              })
            }
          />
          <span aria-hidden className="text-muted-foreground text-sm">
            &ndash;
          </span>
          <TimeField
            aria-label={t("common:fields.endTime")}
            value={match(value.to)
              .with(P.nullish, () => "")
              .otherwise(() => toClock)}
            disabled={!value.to}
            placeholder={t("common:fields.pickDayFirst")}
            onChange={(clock) =>
              onChange({
                from: value.from,
                to: pipe(
                  O.fromNullable(value.to),
                  O.map((day: Date) => withClock(day, clock)),
                  O.toNullable,
                ),
              })
            }
          />

          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={!value.from && !value.to}
            onClick={() => onChange({ from: null, to: null })}
          >
            {t("common:fields.clearDates")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, DateRangePicker, DateTimePicker, normalizeClock, TimeField };
