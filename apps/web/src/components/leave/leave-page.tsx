import { formatDate, formatRange } from "@absqir/core/date";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@absqir/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A } from "@mobily/ts-belt";
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
  const decideLabel = approving ? "Approve" : "Decline";

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
            {approving ? "Approve" : "Decline"} {props.pending?.request.personName}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {approving
              ? "The record for this event shows excused instead of absent."
              : "The record stays as it is. The member sees your note."}
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
                variant={approving ? "default" : "destructive"}
                disabled={decide.isPending}
              >
                {decide.isPending ? "Saving…" : decideLabel}
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
  if (props.rows.length === 0) {
    return (
      <Empty className="border-border rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotePencilIcon />
          </EmptyMedia>
          <EmptyTitle>
            {props.scope === "pending" ? "Nothing to decide" : "Nothing decided yet"}
          </EmptyTitle>
          <EmptyDescription>
            {props.scope === "pending"
              ? "A member who cannot make an event asks here. You approve or decline."
              : "Approved and declined requests land here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Asked</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-44" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {A.map(props.rows, (row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.personName}</TableCell>
              <TableCell>
                <a href={`/events/${row.eventId}`} className="hover:underline">
                  {row.eventTitle}
                </a>
                <p className="text-muted-foreground text-xs">
                  {formatRange(new Date(row.startsAt), new Date(row.endsAt))}
                </p>
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                {row.reason}
                {row.decisionNote ? (
                  <p className="text-muted-foreground text-xs">Note: {row.decisionNote}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDate(new Date(row.createdAt), "date")}
              </TableCell>
              <TableCell>
                <LeaveStatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                {row.status === "pending" ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => props.onDecide({ request: row, decision: "declined" })}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => props.onDecide({ request: row, decision: "approved" })}
                    >
                      Approve
                    </Button>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
