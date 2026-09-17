import { formatRange, relativeToNow } from "@absqir/core/date";
import { askableEvents } from "@absqir/core/leave-choices";
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
import { Form, FormField } from "@absqir/ui/form";
import { cn } from "@absqir/ui/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { Skeleton } from "@absqir/ui/skeleton";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A, F, pipe } from "@mobily/ts-belt";
import { CalendarBlankIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { type AskLeaveValues, askLeaveSchema, REASON_LIMIT } from "@/lib/leave-schemas";
import { useAskLeave } from "@/mutations/use-ask-leave";
import { useMyLeave } from "@/queries/use-leave";
import { type MyEvent, useMyEvents } from "@/queries/use-my";

export type AskLeaveTarget = Pick<MyEvent, "id" | "title" | "startsAt" | "endsAt">;

export interface AskLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An event chosen before the dialog opened. The picker stays hidden. */
  event?: AskLeaveTarget | null;
}

/** Enough rows to offer every event still ahead without a second page. */
const CHOICES = 50;

/** What the picker offers: an event, narrowed to what a row shows. */
type Choice = Pick<MyEvent, "id" | "title" | "startsAt" | "endsAt" | "status" | "record">;

/** The event, as the reader confirms it: the title, the day, and how far off. */
function EventSummary(props: { title: string; startsAt: string; endsAt: string }) {
  const t = useTranslate();
  const startsAt = new Date(props.startsAt);

  return (
    <div className="bg-muted/50 ring-foreground/10 rounded-lg px-3 py-2 ring-1">
      <p className="text-sm font-medium">{props.title}</p>
      <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
        <CalendarBlankIcon aria-hidden />
        <span className="tabular-nums">{formatRange(startsAt, new Date(props.endsAt))}</span>
        <span aria-hidden>·</span>
        <span>{t("my:leave.dialog.starts", { when: relativeToNow(startsAt) })}</span>
      </p>
    </div>
  );
}

/** What the reader sees once the request is in, instead of a dialog vanishing. */
function Sent(props: { title: string; onClose: () => void }) {
  const t = useTranslate();

  return (
    <>
      <ResponsiveDialogBody>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircleIcon
            weight="fill"
            className="size-10 text-emerald-600 dark:text-emerald-400"
          />
          <div>
            <p className="font-medium">{t("my:leave.dialog.sentTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("my:leave.dialog.sentHint", { title: props.title })}
            </p>
          </div>
        </div>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button onClick={props.onClose}>{t("common:actions.done")}</Button>
      </ResponsiveDialogFooter>
    </>
  );
}

export function AskLeaveDialog(props: AskLeaveDialogProps) {
  const t = useTranslate();
  const events = useMyEvents({ scope: "upcoming", q: "", limit: CHOICES });
  const mine = useMyLeave({ scope: "all", limit: CHOICES });
  const ask = useAskLeave();
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<AskLeaveValues>({
    resolver: zodResolver(askLeaveSchema(t)),
    defaultValues: { eventId: "", reason: "" },
  });

  const preset = props.event ?? null;

  useEffect(() => {
    if (props.open) {
      form.reset({ eventId: preset?.id ?? "", reason: "" });
      setSent(null);
    }
  }, [props.open, preset, form]);

  const asked = pipe(
    mine.data?.pages ?? [],
    A.flatMap((page) => page.items),
    A.map((row) => row.eventId),
  );
  // Still ahead, no record yet, and not already asked about. The rule lives
  // in core, where it can be tested.
  const choices: Choice[] = askableEvents(
    pipe(
      events.data?.pages ?? [],
      A.flatMap((page) => page.items),
      F.toMutable,
    ),
    asked,
  );

  const loading = events.isPending || mine.isPending;
  const nothingToAsk = !loading && choices.length === 0 && preset === null;
  const reason = form.watch("reason");
  const chosenId = form.watch("eventId");
  const chosen = A.find(choices, (choice) => choice.id === chosenId);
  const overLimit = reason.length > REASON_LIMIT;

  const onSubmit = (values: AskLeaveValues) => {
    ask.mutate(values, {
      onSuccess: () => setSent(preset?.title ?? chosen?.title ?? ""),
    });
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={props.onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("my:leave.dialog.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("my:leave.dialog.description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {match(sent)
          .with(P.string, (title) => (
            <Sent title={title} onClose={() => props.onOpenChange(false)} />
          ))
          .otherwise(() => (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col gap-4"
                noValidate
              >
                <ResponsiveDialogBody>
                  {match({ preset, loading, nothingToAsk })
                    // An event chosen before the dialog opened needs no picker.
                    .with({ preset: P.nonNullable }, ({ preset }) => (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t("my:leave.dialog.which")}</p>
                        <EventSummary
                          title={preset.title}
                          startsAt={preset.startsAt}
                          endsAt={preset.endsAt}
                        />
                      </div>
                    ))
                    .with({ loading: true }, () => (
                      <div className="space-y-2" aria-busy>
                        <p className="text-sm font-medium">{t("my:leave.dialog.which")}</p>
                        <Skeleton className="h-9 rounded-lg" />
                      </div>
                    ))
                    // Saying so here beats an empty list the reader has to
                    // open a picker to discover.
                    .with({ nothingToAsk: true }, () => (
                      <div className="border-border rounded-lg border border-dashed px-3 py-6 text-center">
                        <p className="text-sm font-medium">{t("my:leave.dialog.nothingAhead")}</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t("my:leave.dialog.nothingAheadHint")}
                        </p>
                      </div>
                    ))
                    .otherwise(() => (
                      <FormField
                        control={form.control}
                        name="eventId"
                        label={t("my:leave.dialog.which")}
                        description={t("my:leave.dialog.eventHint")}
                        render={(field) => (
                          <Combobox
                            items={choices}
                            itemToStringLabel={(choice: Choice) => choice.title}
                            value={chosen ?? null}
                            onValueChange={(value) =>
                              field.onChange(
                                match(value)
                                  .with({ id: P.string }, (choice) => choice.id)
                                  .otherwise(() => ""),
                              )
                            }
                          >
                            <ComboboxInput
                              id="leave-event"
                              placeholder={t("my:leave.dialog.pickEvent")}
                              className="w-full"
                              showClear
                            />
                            <ComboboxContent>
                              <ComboboxEmpty>{t("my:leave.dialog.noMatch")}</ComboboxEmpty>
                              <ComboboxList>
                                {(choice: Choice) => (
                                  <ComboboxItem key={choice.id} value={choice}>
                                    <span className="flex min-w-0 flex-col">
                                      <span className="truncate">{choice.title}</span>
                                      <span className="text-muted-foreground text-xs tabular-nums">
                                        {formatRange(
                                          new Date(choice.startsAt),
                                          new Date(choice.endsAt),
                                        )}
                                      </span>
                                    </span>
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        )}
                      />
                    ))}

                  {/* What was picked, spelled out, so nobody asks off the
                      wrong event because two of them share a title. */}
                  {match({ preset, chosen })
                    .with({ preset: P.nullish, chosen: P.nonNullable }, ({ chosen }) => (
                      <EventSummary
                        title={chosen.title}
                        startsAt={chosen.startsAt}
                        endsAt={chosen.endsAt}
                      />
                    ))
                    .otherwise(() => null)}

                  {match(nothingToAsk)
                    .with(true, () => null)
                    .otherwise(() => (
                      <FormField
                        control={form.control}
                        name="reason"
                        label={t("my:leave.dialog.why")}
                        description={t("my:leave.dialog.reasonHint")}
                        render={(field) => (
                          <div className="space-y-1.5">
                            <Textarea
                              {...field}
                              id="leave-reason"
                              rows={3}
                              placeholder={t("my:leave.dialog.reasonPlaceholder")}
                            />
                            <p
                              aria-live="polite"
                              className={cn(
                                "text-right text-xs tabular-nums",
                                match(overLimit)
                                  .with(true, () => "text-destructive" as const)
                                  .otherwise(() => "text-muted-foreground" as const),
                              )}
                            >
                              {t("my:leave.dialog.counter", {
                                count: reason.length,
                                limit: REASON_LIMIT,
                              })}
                            </p>
                          </div>
                        )}
                      />
                    ))}

                  <FormError error={ask.error} />
                </ResponsiveDialogBody>
                <ResponsiveDialogFooter>
                  <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                    {match(nothingToAsk)
                      .with(true, () => t("common:actions.close"))
                      .otherwise(() => t("common:actions.cancel"))}
                  </Button>
                  {match(nothingToAsk)
                    .with(true, () => null)
                    .otherwise(() => (
                      <Button type="submit" disabled={ask.isPending || loading}>
                        {match(ask.isPending)
                          .with(true, () => t("my:leave.dialog.sending"))
                          .otherwise(() => t("my:leave.dialog.send"))}
                      </Button>
                    ))}
                </ResponsiveDialogFooter>
              </form>
            </Form>
          ))}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
