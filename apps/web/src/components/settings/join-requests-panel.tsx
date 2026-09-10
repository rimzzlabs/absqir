import { relativeToNow } from "@absqir/core/date";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Button } from "@absqir/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@absqir/ui/item";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { useDecideJoinRequest } from "@/mutations/use-decide-join-request";
import { type JoinRequest, useJoinRequests } from "@/queries/use-join-requests";

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function RequestRow(props: { row: JoinRequest }) {
  const { row } = props;
  const decide = useDecideJoinRequest();

  return (
    <Item variant="outline">
      <ItemMedia>
        <Avatar>
          {row.image ? <AvatarImage src={row.image} alt="" /> : null}
          <AvatarFallback>{initialsOf(row.name)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{row.name}</ItemTitle>
        <ItemDescription>
          {row.email} · asked {relativeToNow(new Date(row.createdAt))}
        </ItemDescription>
        {row.message ? <ItemDescription>“{row.message}”</ItemDescription> : null}
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant="ghost"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ id: row.id, decision: "declined" })}
        >
          <XIcon />
          Decline
        </Button>
        <Button
          size="sm"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ id: row.id, decision: "approved" })}
        >
          <CheckIcon />
          {decide.isPending ? "Saving…" : "Let in"}
        </Button>
      </ItemActions>
    </Item>
  );
}

/** Who asks to join, and the two buttons that answer them. */
export function JoinRequestsPanel() {
  const requests = useJoinRequests("pending");
  const decide = useDecideJoinRequest();

  return (
    <div className="space-y-4">
      {match(requests)
        .with({ isPending: true }, () => <Skeleton className="h-24 rounded-xl" />)
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (data) =>
          data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nobody is waiting. A request lands here when someone at a verified domain asks to come
              in.
            </p>
          ) : (
            <div className="space-y-3">
              {A.map(data.items, (row) => (
                <RequestRow key={row.id} row={row} />
              ))}
            </div>
          ),
        )
        .otherwise(() => null)}

      <FormError error={decide.error} />
    </div>
  );
}
