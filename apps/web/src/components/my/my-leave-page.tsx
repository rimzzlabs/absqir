import { formatDate, formatRange } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Form, FormField } from "@absqir/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@absqir/ui/select";
import { Skeleton } from "@absqir/ui/skeleton";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { type AskLeaveValues, askLeaveSchema } from "@/lib/leave-schemas";
import { useAskLeave } from "@/mutations/use-ask-leave";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import { type LeaveRequest, useMyLeave } from "@/queries/use-leave";
import { useMySessions } from "@/queries/use-my";

function AskDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const sessions = useMySessions();
  const mine = useMyLeave();
  const ask = useAskLeave();
  const form = useForm<AskLeaveValues>({
    resolver: zodResolver(askLeaveSchema),
    defaultValues: { sessionId: "", reason: "" },
  });

  useEffect(() => {
    if (props.open) form.reset({ sessionId: "", reason: "" });
  }, [props.open, form]);

  // Only sessions still ahead, without a record, and without a request already.
  const asked = new Set((mine.data ?? []).map((row) => row.sessionId));
  const options = (sessions.data ?? [])
    .filter((session) => session.status !== "done" && !session.record && !asked.has(session.id))
    .map((session) => ({
      value: session.id,
      label: session.title,
      hint: formatRange(new Date(session.startsAt), new Date(session.endsAt)),
    }));

  const onSubmit = (values: AskLeaveValues) => {
    ask.mutate(values, { onSuccess: () => props.onOpenChange(false) });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask for leave</DialogTitle>
          <DialogDescription>
            An organizer decides. If approved, the session shows you as excused.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="sessionId"
              label="Session"
              render={(field) => (
                <Select
                  items={options.map((option) => ({ value: option.value, label: option.label }))}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger id="leave-session" className="w-full">
                    <SelectValue placeholder="Pick a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-1.5 text-sm">
                        Nothing ahead of you to ask about.
                      </p>
                    ) : (
                      options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span>{option.label}</span>
                          <span className="text-muted-foreground text-xs">{option.hint}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              label="Reason"
              render={(field) => (
                <Textarea
                  {...field}
                  id="leave-reason"
                  rows={3}
                  placeholder="Doctor's appointment"
                />
              )}
            />
            <FormError error={ask.error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={ask.isPending}>
                {ask.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RequestRow(props: { request: LeaveRequest }) {
  const { request } = props;
  const withdraw = useWithdrawLeave();

  return (
    <li className="border-border flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{request.sessionTitle}</p>
          <LeaveStatusBadge status={request.status} />
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatRange(new Date(request.startsAt), new Date(request.endsAt))}
        </p>
        <p className="mt-2 text-sm">{request.reason}</p>
        {request.decisionNote ? (
          <p className="text-muted-foreground mt-1 text-xs">Note: {request.decisionNote}</p>
        ) : null}
        <p className="text-muted-foreground mt-1 text-xs">
          Asked {formatDate(new Date(request.createdAt), "date")}
          {request.decidedAt ? ` · decided ${formatDate(new Date(request.decidedAt), "date")}` : ""}
        </p>
        <FormError error={withdraw.error} />
      </div>
      {request.status === "pending" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate(request.id)}
        >
          {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
        </Button>
      ) : null}
    </li>
  );
}

function MyLeaveBody() {
  const mine = useMyLeave();
  const [asking, setAsking] = useState(false);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Ask to be excused before a session happens, and see what was decided."
        actions={
          <Button onClick={() => setAsking(true)}>
            <PlusIcon />
            Ask for leave
          </Button>
        }
      />

      {match(mine)
        .with({ isPending: true }, () => <Skeleton className="h-40 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (rows) =>
          rows.length === 0 ? (
            <Empty className="border-border rounded-xl border border-dashed py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <NotePencilIcon />
                </EmptyMedia>
                <EmptyTitle>No requests yet</EmptyTitle>
                <EmptyDescription>
                  Cannot make a session? Ask here before it starts, with a reason.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-3">
              {rows.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </ul>
          ),
        )
        .otherwise(() => null)}

      <AskDialog open={asking} onOpenChange={setAsking} />
    </>
  );
}

export function MyLeavePage() {
  return (
    <Providers>
      <MyLeaveBody />
    </Providers>
  );
}
