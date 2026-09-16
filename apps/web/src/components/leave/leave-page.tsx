import { formatDate, formatRange } from "@absqir/core/date";
import type { Locale, Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
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
import { NotePencilIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
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

function leaveColumns(t: Translate, onDecide: (d: Decision) => void): DataColumn<LeaveRequest>[] {
  return [
    {
      key: "person",
      header: t("leave:person"),
      place: "primary",
      cell: (row) => row.personName,
      cellClassName: "font-medium",
    },
    {
      key: "event",
      header: t("leave:event"),
      cell: (row) => (
        <>
          <a href={`/events/${row.eventId}`} className="hover:underline">
            {row.eventTitle}
          </a>
          <p className="text-muted-foreground text-xs">
            {formatRange(new Date(row.startsAt), new Date(row.endsAt))}
          </p>
        </>
      ),
    },
    {
      key: "reason",
      header: t("leave:reason"),
      cell: (row) => (
        <>
          {row.reason}
          {match(row.decisionNote)
            .with(P.string.minLength(1), (decisionNote) => (
              <p className="text-muted-foreground text-xs">
                {t("leave:note", { note: decisionNote })}
              </p>
            ))
            .otherwise(() => null)}
        </>
      ),
      cellClassName: "max-w-xs whitespace-normal",
    },
    {
      key: "asked",
      header: t("leave:asked"),
      cell: (row) => formatDate(new Date(row.createdAt), "date"),
      cellClassName: "text-muted-foreground tabular-nums",
    },
    {
      key: "status",
      header: t("leave:status"),
      cell: (row) => <LeaveStatusBadge status={row.status} />,
    },
    {
      key: "decide",
      place: "footer",
      headClassName: "w-44",
      cell: (row) =>
        match(row.status)
          .with("pending", () => (
            <div className="flex gap-2 md:justify-end">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 md:flex-none"
                onClick={() => onDecide({ request: row, decision: "declined" })}
              >
                {t("leave:decline")}
              </Button>
              <Button
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => onDecide({ request: row, decision: "approved" })}
              >
                {t("leave:approve")}
              </Button>
            </div>
          ))
          .otherwise(() => null),
    },
  ];
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
    <DataTable
      label={t("leave:tableLabel")}
      columns={leaveColumns(t, props.onDecide)}
      rows={props.rows}
      getKey={(row) => row.id}
    />
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

      <Tabs value={scope} onValueChange={(value) => void setScope(value as QueueScope)}>
        <TabsList>
          <TabsTrigger value="pending">{t("leave:pending")}</TabsTrigger>
          <TabsTrigger value="decided">{t("leave:decided")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {match(queue)
        .with({ isPending: true }, () => <Skeleton className="h-48 rounded-xl" />)
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
