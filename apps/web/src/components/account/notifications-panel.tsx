import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@absqir/core/notification-channel";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@absqir/ui/field";
import { cn } from "@absqir/ui/lib/utils";
import { RadioGroup, RadioGroupItem } from "@absqir/ui/radio-group";
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
import { match } from "ts-pattern";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { FormError } from "@/components/shared/form-error";
import { useUpdateNotificationChannel } from "@/mutations/use-update-notification-channel";

export interface NotificationsPanelProps {
  channel: NotificationChannel;
}

const OPTIONS: { value: NotificationChannel; title: string; hint: string; icon: Icon }[] = [
  {
    value: "all",
    title: "App and email",
    hint: "The bell counts it. Reminders and leave also arrive by email.",
    icon: BellRingingIcon,
  },
  {
    value: "in-app",
    title: "App only",
    hint: "The bell and the notifications page. No email.",
    icon: BellSimpleIcon,
  },
  {
    value: "email",
    title: "Email only",
    hint: "Reminders and leave by email. The bell stays quiet.",
    icon: EnvelopeSimpleIcon,
  },
  {
    value: "none",
    title: "Off",
    hint: "Nothing at all. Events still expect you.",
    icon: BellSlashIcon,
  },
];

/** What absqir writes, who reads it, and whether an email ever follows. */
const KINDS: { title: string; who: string; emailed: boolean }[] = [
  { title: "Event reminder", who: "Everyone expected", emailed: true },
  { title: "Leave requested", who: "Organizers", emailed: true },
  { title: "Leave decided", who: "The member who asked", emailed: true },
  { title: "Event closed", who: "Organizers", emailed: false },
];

function reachesApp(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "in-app";
}

function reachesEmail(channel: NotificationChannel): boolean {
  return channel === "all" || channel === "email";
}

function Mark(props: { on: boolean; label: string }) {
  return props.on ? (
    <span className="text-primary inline-flex items-center gap-1 text-sm">
      <CheckIcon weight="bold" className="size-4" />
      <span className="sr-only">{props.label}</span>
    </span>
  ) : (
    <span className="text-muted-foreground/60 inline-flex items-center">
      <MinusIcon className="size-4" />
      <span className="sr-only">No {props.label.toLowerCase()}</span>
    </span>
  );
}

function isChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/** Where notifications reach this account. Saved as soon as it changes. */
export function NotificationsPanel(props: NotificationsPanelProps) {
  const [channel, setChannel] = useState(props.channel);
  const save = useUpdateNotificationChannel();
  const saveNote = match(save)
    .with({ isPending: true }, () => "Saving…")
    .with({ isSuccess: true }, () => "Saved.")
    .otherwise(() => null);

  const choose = (value: unknown) => {
    if (typeof value !== "string" || !isChannel(value) || value === channel) return;

    const previous = channel;
    setChannel(value);
    save.mutate(value, { onError: () => setChannel(previous) });
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Where absqir reaches you. The choice belongs to the account, so it follows you to every device."
    >
      <SettingsRow
        label="Delivery"
        hint={
          <>
            Applies from now on. What was already written stays where it is.
            {saveNote ? (
              <span className="text-foreground block pt-2" role="status">
                {saveNote}
              </span>
            ) : null}
          </>
        }
      >
        <RadioGroup
          aria-label="Delivery"
          value={channel}
          onValueChange={choose}
          className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
        >
          {OPTIONS.map((option) => (
            <FieldLabel key={option.value} htmlFor={`channel-${option.value}`}>
              <Field orientation="horizontal" className="h-full items-start">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                    option.value === channel
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <option.icon
                    className="size-4"
                    weight={option.value === channel ? "fill" : "regular"}
                  />
                </span>
                <FieldContent>
                  <FieldTitle>{option.title}</FieldTitle>
                  <FieldDescription>{option.hint}</FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`channel-${option.value}`} value={option.value} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        <FormError error={save.error} />
      </SettingsRow>

      <SettingsRow
        label="What arrives"
        hint="Each kind, who it is for, and where it goes with the choice above."
      >
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Kind
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Who
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  In the app
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {KINDS.map((kind) => (
                <tr key={kind.title}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{kind.title}</td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {kind.who}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Mark on={reachesApp(channel)} label="In the app" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Mark on={kind.emailed && reachesEmail(channel)} label="Email" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Email needs the instance to have a mail provider. Without one, only the app receives.
        </p>
      </SettingsRow>
    </SettingsSection>
  );
}
