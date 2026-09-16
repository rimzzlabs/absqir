import { describeTimezone, listTimezones } from "@absqir/core/timezone";
import { useTranslate } from "@absqir/i18n/react";
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
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { SettingsRow } from "@/components/shared/settings-section";
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
  const t = useTranslate();
  const [chosen, setChosen] = useState<string | null>(props.timezone);
  const save = useUpdateTimezone();
  const device = useDeviceTimezone();
  const zones = listTimezones();
  const dirty = chosen !== props.timezone;
  const followingLabel = match(device)
    .with(P.string.minLength(1), (device) =>
      t("account:timezone.followingDevice", { zone: describeTimezone(device) }),
    )
    .otherwise(() => t("account:timezone.following"));

  return (
    <SettingsRow label={t("account:timezone.label")} hint={t("account:timezone.hint")}>
      <div className="flex flex-col gap-3">
        <Combobox
          items={zones}
          value={chosen}
          onValueChange={(value) =>
            setChosen(
              match(value)
                .with(P.string, (value) => value)
                .otherwise(() => null),
            )
          }
          itemToStringLabel={(zone) => describeTimezone(zone)}
        >
          <ComboboxInput
            id="timezone"
            aria-label={t("account:timezone.label")}
            placeholder={t("account:timezone.search")}
            className="w-full sm:max-w-md"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>{t("account:timezone.empty")}</ComboboxEmpty>
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
          {match(chosen)
            .with(P.string.minLength(1), (chosen) =>
              t("account:timezone.willRead", { zone: describeTimezone(chosen) }),
            )
            .otherwise(() => followingLabel)}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending || !dirty}
            onClick={() => save.mutate(chosen)}
          >
            {match(save.isPending)
              .with(true, () => t("common:actions.saving"))
              .otherwise(() => t("common:actions.save"))}
          </Button>
          {match(Boolean(device && chosen !== device))
            .with(true, () => (
              <Button
                type="button"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => setChosen(device)}
              >
                {t("account:timezone.useDevice")}
              </Button>
            ))
            .otherwise(() => null)}
        </div>
        <FormError error={save.error} />
      </div>
    </SettingsRow>
  );
}
