import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Form, FormField } from "@absqir/ui/form";
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
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A } from "@mobily/ts-belt";
import { NotePencilIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { LeaveRow } from "@/components/leave/leave-row";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { StickyToolbar } from "@/components/shared/sticky-toolbar";
import { type DecideLeaveValues, decideLeaveSchema } from "@/lib/leave-schemas";
import { useDecideLeave } from "@/mutations/use-decide-leave";
import { type LeaveRequest, type LeaveScope, useLeaveQueue } from "@/queries/use-leave";

type Decision = { request: LeaveRequest; decision: "approved" | "declined" } | null;

function DecisionDialog(props: { pending: Decision; onClose: () => void }) {
  const t = useTranslate();
  const decide = useDecideLeave();
  const form = useForm<DecideLeaveValues>({
    resolver: zodResolver(decideLeaveSchema(t)),
    defaultValues: { note: "" },
  });
  const open = props.pending !== null;

  useEffect(() => {
    if (open) form.reset({ note: "" });
  }, [open, form]);

  const approving = props.pending?.decision === "approved";
  const decideLabel = match(approving)
    .with(true, () => t("leave:approve"))
    .otherwise(() => t("leave:decline"));

  const onSubmit = (values: DecideLeaveValues) => {
    if (!props.pending) return;

    decide.mutate(
      {
        id: props.pending.request.id,
        decision: props.pending.decision,
        note: values.note || null,
      },
      { onSuccess: props.onClose },
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => !next && props.onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("leave:dialog.title", {
              decision: decideLabel,
              name: props.pending?.request.personName ?? "",
            })}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(approving)
              .with(true, () => t("leave:dialog.approveDescription"))
              .otherwise(() => t("leave:dialog.declineDescription"))}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
            noValidate
          >
            <ResponsiveDialogBody>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">
                  {props.pending?.request.eventTitle}
                </span>
                {" · "}
                {props.pending?.request.reason}
              </p>
              <FormField
                control={form.control}
                name="note"
                label={t("leave:dialog.note")}
                description={t("leave:dialog.noteHint")}
                render={(field) => <Textarea {...field} id="leave-note" rows={2} autoFocus />}
              />
              <FormError error={decide.error} />
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={props.onClose}>
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="submit"
                variant={match(approving)
                  .with(true, () => "default" as const)
                  .otherwise(() => "destructive" as const)}
                disabled={decide.isPending}
              >
                {match(decide.isPending)
                  .with(true, () => t("common:actions.saving"))
                  .otherwise(() => decideLabel)}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function Queue(props: {
  rows: readonly LeaveRequest[];
  scope: LeaveScope;
  onDecide: (d: Decision) => void;
}) {
  const t = useTranslate();

  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotePencilIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.scope)
              .with("pending", () => t("leave:emptyPendingTitle"))
              .otherwise(() => t("leave:emptyDecidedTitle"))}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.scope)
              .with("pending", () => t("leave:emptyPendingDescription"))
              .otherwise(() => t("leave:emptyDecidedDescription"))}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label={t("leave:tableLabel")}>
      {A.map(props.rows, (row) => (
        <LeaveRow
          key={row.id}
          request={row}
          withPerson
          actions={match(row.status)
            .with("pending", () => (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.onDecide({ request: row, decision: "declined" })}
                >
                  {t("leave:decline")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => props.onDecide({ request: row, decision: "approved" })}
                >
                  {t("leave:approve")}
                </Button>
              </>
            ))
            .otherwise(() => null)}
        />
      ))}
    </ul>
  );
}

/** The two tabs. The API also knows "all", which the queue never asks for. */
type QueueScope = Extract<LeaveScope, "pending" | "decided">;

const SCOPE = parseAsStringLiteral([
  "pending",
  "decided",
] as const satisfies QueueScope[]).withDefault("pending");

function LeaveBody() {
  const t = useTranslate();
  const [scope, setScope] = useQueryState("status", SCOPE);
  const queue = useLeaveQueue(scope);
  const [pending, setPending] = useState<Decision>(null);

  return (
    <>
      <PageHeader title={t("leave:title")} description={t("leave:description")} />

      <StickyToolbar>
        <Tabs
          value={scope}
          onValueChange={(value) => void setScope(value as QueueScope)}
          className="w-full sm:w-auto"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pending">{t("leave:pending")}</TabsTrigger>
            <TabsTrigger value="decided">{t("leave:decided")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </StickyToolbar>

      {match(queue)
        .with({ isPending: true }, () => (
          <div className="flex flex-col gap-2" aria-busy>
            {A.map([0, 1, 2], (key) => (
              <Skeleton key={key} className="h-28 rounded-xl" />
            ))}
          </div>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) => (
          <Queue rows={rows} scope={scope} onDecide={setPending} />
        ))
        .otherwise(() => null)}

      <DecisionDialog pending={pending} onClose={() => setPending(null)} />
    </>
  );
}

export interface LeavePageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function LeavePage(props: LeavePageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <LeaveBody />
    </Providers>
  );
}
