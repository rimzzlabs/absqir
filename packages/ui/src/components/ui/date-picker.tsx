import { A } from "@mobily/ts-belt";

("use client");

import { CalendarBlankIcon, ClockIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { format, isValid, setHours, setMinutes } from "date-fns";
import * as React from "react";
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
  placeholder = "Pick a date",
  disabled,
  fromDate,
  toDate,
  displayFormat = "EEE d MMM yyyy",
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

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
        {value ? format(value, displayFormat) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(8)]"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
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
            const base = CLOCK.test(draft) ? draft : (normalizeClock(draft) ?? value) || "00:00";
            const next = shiftClock(base, event.key === "ArrowUp" ? step : -step);
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
  placeholder = "Pick a date and time",
  displayFormat = "EEE d MMM yyyy, HH:mm",
  className,
  ...props
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const clock = value && isValid(value) ? format(value, "HH:mm") : "09:00";

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
        <span className="truncate">{value ? format(value, displayFormat) : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-fit gap-0 p-0" align="start">
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(8)]"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
          onSelect={(day) => onChange(day ? withClock(day, clock) : null)}
        />
        <div className="border-border flex items-center gap-2 border-t p-2">
          <TimeField
            id={id ? `${id}-time` : undefined}
            aria-label="Time"
            value={value ? clock : ""}
            disabled={!value}
            placeholder={value ? undefined : "Pick a day first"}
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

export { DatePicker, DateTimePicker, normalizeClock, TimeField };
