import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@absqir/core/notification-channel";
import { useTranslate } from "@absqir/i18n/react";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@absqir/ui/field";
import { cn } from "@absqir/ui/lib/utils";
import { RadioGroup, RadioGroupItem } from "@absqir/ui/radio-group";
import { A } from "@mobily/ts-belt";
import {
  BellRingingIcon,
  BellSimpleIcon,
  BellSlashIcon,
  CheckIcon,
  EnvelopeSimpleIcon,
  type Icon,
  MinusIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { SettingsRow, SettingsSection } from "@/components/shared/settings-section";
import { useUpdateNotificationChannel } from "@/mutations/use-update-notification-channel";

export interface NotificationsPanelProps {
  channel: NotificationChannel;
}

/** The channel, the icon beside it, and the key that words it. */
const OPTIONS: {
  value: NotificationChannel;
  key: "all" | "inApp" | "email" | "none";
  icon: Icon;
}[] = [
  { value: "all", key: "all", icon: BellRingingIcon },
  { value: "in-app", key: "inApp", icon: BellSimpleIcon },
  { value: "email", key: "email", icon: EnvelopeSimpleIcon },
  { value: "none", key: "none", icon: BellSlashIcon },
];

/** What absqir writes, who reads it, and whether an email ever follows. */
const KINDS: {
  key: "reminder" | "leaveRequested" | "leaveDecided" | "eventClosed";
  emailed: boolean;
}[] = [
  { key: "reminder", emailed: true },
  { key: "leaveRequested", emailed: true },
  { key: "leaveDecided", emailed: true },
  { key: "eventClosed", emailed: false },
];

function reachesApp(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "in-app";
}

function reachesEmail(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "email";
}

function Mark(props: { on: boolean; label: string; absent: string }) {
  return match(props.on)
    .with(true, () => (
      <span className="text-primary inline-flex items-center gap-1 text-sm">
        <CheckIcon weight="bold" className="size-4" />
        <span className="sr-only">{props.label}</span>
      </span>
    ))
    .otherwise(() => (
      <span className="text-muted-foreground/60 inline-flex items-center">
        <MinusIcon className="size-4" />
        <span className="sr-only">{props.absent}</span>
      </span>
    ));
}

function isChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/** Where notifications reach this account. Saved as soon as it changes. */
export function NotificationsPanel(props: NotificationsPanelProps) {
  const t = useTranslate();
  const [channel, setChannel] = useState(props.channel);
  const save = useUpdateNotificationChannel();
  const saveNote = match(save)
    .with({ isPending: true }, () => t("common:actions.saving"))
    .with({ isSuccess: true }, () => t("account:notifications.saved"))
    .otherwise(() => null);

  const choose = (value: unknown) => {
    if (typeof value !== "string" || !isChannel(value) || value === channel) return;

    const previous = channel;
    setChannel(value);
    save.mutate(value, { onError: () => setChannel(previous) });
  };

  return (
    <SettingsSection
      title={t("account:notifications.title")}
      description={t("account:notifications.description")}
    >
      <SettingsRow
        label={t("account:notifications.delivery")}
        hint={
          <>
            {t("account:notifications.deliveryHint")}
            {match(saveNote)
              .with(P.string.minLength(1), (saveNote) => (
                <span className="text-foreground block pt-2" role="status">
                  {saveNote}
                </span>
              ))
              .otherwise(() => null)}
          </>
        }
      >
        <RadioGroup
          aria-label={t("account:notifications.delivery")}
          value={channel}
          onValueChange={choose}
          className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
        >
          {A.map(OPTIONS, (option) => (
            <FieldLabel key={option.value} htmlFor={`channel-${option.value}`}>
              <Field orientation="horizontal" className="h-full items-start">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                    match(option.value === channel)
                      .with(true, () => "bg-primary/10 text-primary" as const)
                      .otherwise(() => "bg-muted text-muted-foreground" as const),
                  )}
                >
                  <option.icon
                    className="size-4"
                    weight={match(option.value === channel)
                      .with(true, () => "fill" as const)
                      .otherwise(() => "regular" as const)}
                  />
                </span>
                <FieldContent>
                  <FieldTitle>{t(`account:notifications.channels.${option.key}`)}</FieldTitle>
                  <FieldDescription>
                    {t(`account:notifications.channels.${option.key}Hint`)}
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`channel-${option.value}`} value={option.value} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        <FormError error={save.error} />
      </SettingsRow>

      <SettingsRow
        label={t("account:notifications.table.label")}
        hint={t("account:notifications.table.hint")}
      >
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {t("account:notifications.table.kind")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {t("account:notifications.table.who")}
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  {t("account:notifications.table.inApp")}
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  {t("account:notifications.table.email")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {A.map(KINDS, (kind) => (
                <tr key={kind.key}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                    {t(`account:notifications.kinds.${kind.key}`)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {t(`account:notifications.kinds.${kind.key}Who`)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Mark
                      on={reachesApp(channel)}
                      label={t("account:notifications.table.inApp")}
                      absent={t("account:notifications.table.noInApp")}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Mark
                      on={kind.emailed && reachesEmail(channel)}
                      label={t("account:notifications.table.email")}
                      absent={t("account:notifications.table.noEmail")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {t("account:notifications.table.footnote")}
        </p>
      </SettingsRow>
    </SettingsSection>
  );
}
