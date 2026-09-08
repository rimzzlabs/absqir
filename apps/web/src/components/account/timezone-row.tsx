import { describeTimezone, listTimezones } from "@absqir/core/timezone";
import { Button } from "@absqir/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@absqir/ui/combobox";
import { GlobeHemisphereEastIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { SettingsRow } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { useDeviceTimezone } from "@/lib/use-device-timezone";
import { useUpdateTimezone } from "@/mutations/use-update-timezone";

export interface TimezoneRowProps {
  /** The stored choice. Null follows the device. */
  timezone: string | null;
}

/**
 * The zone the account reads every time in. The list is the runtime's own,
 * so it never goes stale, and the choice saves when the reader confirms it.
 */
export function TimezoneRow(props: TimezoneRowProps) {
  const [chosen, setChosen] = useState<string | null>(props.timezone);
  const save = useUpdateTimezone();
  const device = useDeviceTimezone();
  const zones = listTimezones();
  const dirty = chosen !== props.timezone;

  return (
    <SettingsRow
      label="Time zone"
      hint="Every time in the app, and the reminders you receive, read in this clock. People in other places see the same moment in theirs."
    >
      <div className="flex flex-col gap-3">
        <Combobox
          items={zones}
          value={chosen}
          onValueChange={(value) => setChosen(typeof value === "string" ? value : null)}
          itemToStringLabel={(zone) => describeTimezone(zone)}
        >
          <ComboboxInput
            id="timezone"
            aria-label="Time zone"
            placeholder="Search a city or a zone"
            className="w-full sm:max-w-md"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>No zone matches.</ComboboxEmpty>
            <ComboboxList>
              {(zone: string) => (
                <ComboboxItem key={zone} value={zone}>
                  {describeTimezone(zone)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <GlobeHemisphereEastIcon aria-hidden className="size-3.5" />
          {chosen
            ? `Times will read in ${describeTimezone(chosen)}.`
            : device
              ? `Following this device: ${describeTimezone(device)}.`
              : "Following this device."}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate(chosen)}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          {device && chosen !== device ? (
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => setChosen(device)}
            >
              Use this device's zone
            </Button>
          ) : null}
        </div>
        <FormError error={save.error} />
      </div>
    </SettingsRow>
  );
}
