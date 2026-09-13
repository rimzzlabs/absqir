import { formatDate, formatRange } from "@absqir/core/date";
import { Button } from "@absqir/ui/button";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { LeaveStatusBadge } from "@/components/shared/status-badge";
import { useWithdrawLeave } from "@/mutations/use-withdraw-leave";
import type { LeaveRequest } from "@/queries/use-leave";

export interface MyLeaveCardProps {
  request: LeaveRequest;
}

/** One of my leave requests, as a card in the grid. */
export function MyLeaveCard(props: MyLeaveCardProps) {
  const { request } = props;
  const withdraw = useWithdrawLeave();
  const decidedNote = match(request.decidedAt)
    .with(P.string.minLength(1), (decidedAt) => (
      <span className="text-muted-foreground text-xs tabular-nums">
        Decided {formatDate(new Date(decidedAt), "date")}
      </span>
    ))
    .otherwise(() => null);

  return (
    <li className="bg-card text-card-foreground ring-foreground/10 flex h-full min-w-0 flex-col gap-3 rounded-xl p-4 ring-1">
      <div className="flex items-center justify-between gap-3">
        <LeaveStatusBadge status={request.status} />
        <span className="text-muted-foreground text-xs tabular-nums">
          Asked {formatDate(new Date(request.createdAt), "date")}
        </span>
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-sm leading-snug font-medium">{request.eventTitle}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatRange(new Date(request.startsAt), new Date(request.endsAt))}
        </p>
      </div>

      <p className="line-clamp-3 text-sm">{request.reason}</p>

      {match(request.decisionNote)
        .with(P.string.minLength(1), (decisionNote) => (
          <p className="text-muted-foreground border-border border-l-2 pl-3 text-xs">
            {decisionNote}
          </p>
        ))
        .otherwise(() => null)}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {match(request.status)
          .with("pending", () => (
            <Button
              size="sm"
              variant="outline"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate(request.id)}
            >
              {match(withdraw.isPending)
                .with(true, () => "Withdrawing…" as const)
                .otherwise(() => "Withdraw" as const)}
            </Button>
          ))
          .otherwise(() => decidedNote)}
      </div>
      <FormError error={withdraw.error} />
    </li>
  );
}
