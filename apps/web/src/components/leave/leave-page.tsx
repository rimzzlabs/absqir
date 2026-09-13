import { formatDate, formatRange } from "@absqir/core/date";
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
  const decide = useDecideLeave();
  const form = useForm<DecideLeaveValues>({
    resolver: zodResolver(decideLeaveSchema),
    defaultValues: { note: "" },
  });
  const open = props.pending !== null;

  useEffect(() => {
    if (open) form.reset({ note: "" });
  }, [open, form]);

  const approving = props.pending?.decision === "approved";
  const decideLabel = match(approving)
    .with(true, () => "Approve" as const)
    .otherwise(() => "Decline" as const);

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
            {match(approving)
              .with(true, () => "Approve" as const)
              .otherwise(() => "Decline" as const)}{" "}
            {props.pending?.request.personName}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {match(approving)
              .with(
                true,
                () => "The record for this event shows excused instead of absent." as const,
              )
              .otherwise(() => "The record stays as it is. The member sees your note." as const)}
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
                label="Note"
                description="Optional. The member sees it."
                render={(field) => <Textarea {...field} id="leave-note" rows={2} autoFocus />}
              />
              <FormError error={decide.error} />
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={props.onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={match(approving)
                  .with(true, () => "default" as const)
                  .otherwise(() => "destructive" as const)}
                disabled={decide.isPending}
              >
                {match(decide.isPending)
                  .with(true, () => "Saving…" as const)
                  .otherwise(() => decideLabel)}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function leaveColumns(onDecide: (d: Decision) => void): DataColumn<LeaveRequest>[] {
  return [
    {
      key: "person",
      header: "Person",
      place: "primary",
      cell: (row) => row.personName,
      cellClassName: "font-medium",
    },
    {
      key: "event",
      header: "Event",
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
      header: "Reason",
      cell: (row) => (
        <>
          {row.reason}
          {match(row.decisionNote)
            .with(P.string.minLength(1), (decisionNote) => (
              <p className="text-muted-foreground text-xs">Note: {decisionNote}</p>
            ))
            .otherwise(() => null)}
        </>
      ),
      cellClassName: "max-w-xs whitespace-normal",
    },
    {
      key: "asked",
      header: "Asked",
      cell: (row) => formatDate(new Date(row.createdAt), "date"),
      cellClassName: "text-muted-foreground tabular-nums",
    },
    {
      key: "status",
      header: "Status",
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
                Decline
              </Button>
              <Button
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => onDecide({ request: row, decision: "approved" })}
              >
                Approve
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
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotePencilIcon />
          </EmptyMedia>
          <EmptyTitle>
            {match(props.scope)
              .with("pending", () => "Nothing to decide" as const)
              .otherwise(() => "Nothing decided yet" as const)}
          </EmptyTitle>
          <EmptyDescription>
            {match(props.scope)
              .with(
                "pending",
                () =>
                  "A member who cannot make an event asks here. You approve or decline." as const,
              )
              .otherwise(() => "Approved and declined requests land here." as const)}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <DataTable
      label="Leave requests"
      columns={leaveColumns(props.onDecide)}
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
  const [scope, setScope] = useQueryState("status", SCOPE);
  const queue = useLeaveQueue(scope);
  const [pending, setPending] = useState<Decision>(null);

  return (
    <>
      <PageHeader
        title="Leave requests"
        description="A member asks to be excused before an event. Approve, and the record shows excused instead of absent."
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as QueueScope)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="decided">Decided</TabsTrigger>
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

export function LeavePage() {
  return (
    <Providers>
      <LeaveBody />
    </Providers>
  );
}
